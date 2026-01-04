// webcontrollers/webCallController.js

import crypto from 'crypto';
import mobileUserModel from '../mobilemodels/mobileUserModel.js';
import mobileCallHistoryModel from '../mobilemodels/mobileCallHistoryModel.js';
import webCallerAgoraService from '../webCallerAgora/webCallerAgoraService.js';
import mobileRecieverPushNotification from '../mobileRecieverAgora/mobileRecieverPushNotification.js';

// Generate unique call ID
const generateCallId = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

/**
 * Web Call Controller
 * Handles call initiation from web to mobile
 * Bridges web database (caller) to mobile database (callee)
 */

/**
 * List available mobile users to call
 * GET /api/web/calls/mobile-users
 * Query params: ?online=true to filter only online users
 */
export const listMobileUsers = async (req, res) => {
  try {
    const { online } = req.query;
    
    let users;
    if (online === 'true') {
      users = await mobileUserModel.findOnlineUsers();
    } else {
      users = await mobileUserModel.findCallableUsers();
    }

    res.status(200).json({
      success: true,
      data: users.map(user => ({
        mobileUserId: user._id,
        mobileUserNanoId: user.mobileUserNanoId,
        email: user.email,
        name: user.name,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }))
    });
  } catch (error) {
    console.error('List mobile users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list mobile users',
      error: error.message
    });
  }
};

/**
 * Search for a mobile user by mobileUserId or email
 * GET /api/web/calls/search
 * Query params: ?mobileUserId=xxx OR ?email=xxx
 */
export const searchMobileUser = async (req, res) => {
  try {
    const { mobileUserId, email } = req.query;

    if (!mobileUserId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Either mobileUserId or email is required'
      });
    }

    let mobileUser;

    if (mobileUserId) {
      // Search by MongoDB _id
      mobileUser = await mobileUserModel.findById(mobileUserId)
        .select('mobileUserNanoId name email isOnline lastSeen expoPushToken');
    } else if (email) {
      // Search by email address
      mobileUser = await mobileUserModel.findOne({ email: email.toLowerCase() })
        .select('mobileUserNanoId name email isOnline lastSeen expoPushToken');
    }

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        message: 'Mobile user not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        mobileUserId: mobileUser._id,
        mobileUserNanoId: mobileUser.mobileUserNanoId,
        name: mobileUser.name,
        email: mobileUser.email,
        isOnline: mobileUser.isOnline,
        lastSeen: mobileUser.lastSeen,
        hasDevice: !!mobileUser.expoPushToken // Can receive calls
      }
    });
  } catch (error) {
    console.error('Search mobile user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search mobile user',
      error: error.message
    });
  }
};

/**
 * Initiate a call to a mobile user
 * POST /api/web/calls/initiate
 * Body: { mobileUserId: "xxx" } OR { email: "xxx@example.com" }
 * 
 * The mobile user will receive a push notification showing:
 * "Incoming Video Call from [webUser.name or webUser.email]"
 */
export const initiateCall = async (req, res) => {
  try {
    const { mobileUserId, email } = req.body;
    const webUser = req.user; // From web auth middleware

    if (!mobileUserId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Either mobileUserId or email is required'
      });
    }

    // Find mobile user by mobileUserId or email
    let mobileUser;
    
    if (mobileUserId) {
      mobileUser = await mobileUserModel.findById(mobileUserId);
    } else if (email) {
      mobileUser = await mobileUserModel.findOne({ email: email.toLowerCase() });
    }
    
    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        message: 'Mobile user not found'
      });
    }

    if (!mobileUser.expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'Mobile user has no registered device. They need to open the app first.'
      });
    }

    // Generate unique call ID and channel name
    const callId = generateCallId(12);
    const channelName = `call_${callId}`;

    // Generate Agora tokens using web caller service
    const tokens = webCallerAgoraService.generateCallTokens(
      channelName, 
      webUser._id.toString(), 
      mobileUser._id.toString()
    );

    // Create call record in mobile database
    const call = await mobileCallHistoryModel.create({
      callId,
      channelName,
      callerId: webUser._id,
      callerEmail: webUser.email,
      callerName: webUser.name || webUser.email,
      calleeId: mobileUser._id,
      calleeEmail: mobileUser.email,
      calleeName: mobileUser.name || mobileUser.email,
      status: 'pending',
      callerToken: tokens.caller.rtcToken,
      calleeToken: tokens.callee.rtcToken
    });

    // Send push notification to mobile device (Expo)
    // Notification shows: "Incoming call from [webUser.name] ([webUser.email])"
    const pushResult = await mobileRecieverPushNotification.sendIncomingCallNotification(
      mobileUser.expoPushToken,
      {
        callId,
        channelName,
        callerId: webUser._id.toString(),
        callerName: webUser.name || 'Unknown',
        callerEmail: webUser.email, // Include email for display
        appId: tokens.appId,
        token: tokens.callee.rtcToken
      }
    );

    // Update call status to ringing
    call.status = 'ringing';
    await call.save();

    res.status(200).json({
      success: true,
      message: 'Call initiated',
      data: {
        callId,
        channelName,
        appId: tokens.appId,
        caller: {
          userId: webUser._id,
          userNanoId: webUser.userNanoId,
          name: webUser.name,
          email: webUser.email,
          uid: tokens.caller.uid,
          rtcToken: tokens.caller.rtcToken,
          rtmToken: tokens.caller.rtmToken
        },
        callee: {
          mobileUserId: mobileUser._id,
          mobileUserNanoId: mobileUser.mobileUserNanoId,
          name: mobileUser.name,
          email: mobileUser.email
        },
        pushNotificationSent: pushResult.success
      }
    });
  } catch (error) {
    console.error('Initiate call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate call',
      error: error.message
    });
  }
};

/**
 * End an ongoing call (from web)
 * POST /api/web/calls/:callId/end
 */
export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const webUser = req.user;

    const call = await mobileCallHistoryModel.findOne({ callId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify web user is the caller
    if (call.callerId.toString() !== webUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not the caller for this call'
      });
    }

    // End the call
    await call.endCall();

    // Notify mobile user
    const mobileUser = await mobileUserModel.findById(call.calleeId);
    if (mobileUser && mobileUser.expoPushToken) {
      await mobileRecieverPushNotification.sendCallEndedNotification(
        mobileUser.expoPushToken,
        { callId, reason: 'caller_ended' }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Call ended',
      data: {
        callId: call.callId,
        status: call.status,
        duration: call.duration
      }
    });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end call',
      error: error.message
    });
  }
};

/**
 * Mark call as missed (timeout from web)
 * POST /api/web/calls/:callId/miss
 */
export const missCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const webUser = req.user;

    const call = await mobileCallHistoryModel.findOne({ callId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (call.callerId.toString() !== webUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not the caller for this call'
      });
    }

    if (!['pending', 'ringing'].includes(call.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as missed. Current status: ${call.status}`
      });
    }

    await call.missCall();

    // Notify mobile user of missed call
    const mobileUser = await mobileUserModel.findById(call.calleeId);
    if (mobileUser && mobileUser.expoPushToken) {
      await mobileRecieverPushNotification.sendMissedCallNotification(
        mobileUser.expoPushToken,
        { 
          callId, 
          callerName: call.callerName,
          callerEmail: call.callerEmail 
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Call marked as missed',
      data: {
        callId: call.callId,
        status: call.status
      }
    });
  } catch (error) {
    console.error('Miss call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark call as missed',
      error: error.message
    });
  }
};

/**
 * Get call details
 * GET /api/web/calls/:callId
 */
export const getCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const webUser = req.user;

    const call = await mobileCallHistoryModel.findOne({ callId })
      .select('-callerToken -calleeToken');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify web user is the caller
    if (call.callerId.toString() !== webUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: call
    });
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get call',
      error: error.message
    });
  }
};

/**
 * Get web user's call history
 * GET /api/web/calls/history
 */
export const getCallHistory = async (req, res) => {
  try {
    const webUser = req.user;
    const { limit = 50, skip = 0, status } = req.query;

    const query = { callerId: webUser._id };
    if (status) query.status = status;

    const calls = await mobileCallHistoryModel.find(query)
      .select('-callerToken -calleeToken')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await mobileCallHistoryModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: calls,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get call history',
      error: error.message
    });
  }
};
