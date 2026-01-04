// mobilecontrollers/mobileCallController.js

import mobileCallHistoryModel from '../mobilemodels/mobileCallHistoryModel.js';
import mobileUserModel from '../mobilemodels/mobileUserModel.js';
import mobileRecieverAgoraService from '../mobileRecieverAgora/mobileRecieverAgoraService.js';

/**
 * Mobile Call Controller
 * Handles call acceptance, rejection, and history for mobile users
 */

/**
 * Accept incoming call
 * POST /api/mobile/calls/:callId/accept
 */
export const acceptCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const mobileUser = req.user;

    const call = await mobileCallHistoryModel.findOne({ callId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify mobile user is the callee
    if (call.calleeId.toString() !== mobileUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not the callee for this call'
      });
    }

    if (!['pending', 'ringing'].includes(call.status)) {
      return res.status(400).json({
        success: false,
        message: `Call cannot be accepted. Current status: ${call.status}`
      });
    }

    // Accept the call
    await call.acceptCall();

    // Generate fresh tokens for mobile user
    const calleeTokens = mobileRecieverAgoraService.generateRtcTokenForUser(
      call.channelName,
      mobileUser._id.toString(),
      'publisher'
    );

    res.status(200).json({
      success: true,
      message: 'Call accepted',
      data: {
        callId: call.callId,
        channelName: call.channelName,
        appId: calleeTokens.appId,
        uid: calleeTokens.uid,
        rtcToken: calleeTokens.token,
        rtmToken: mobileRecieverAgoraService.generateRtmTokenForUser(mobileUser._id.toString()).token,
        startTime: call.startTime,
        caller: {
          name: call.callerName,
          email: call.callerEmail
        }
      }
    });
  } catch (error) {
    console.error('Accept call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept call',
      error: error.message
    });
  }
};

/**
 * Reject incoming call
 * POST /api/mobile/calls/:callId/reject
 */
export const rejectCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { reason } = req.body;
    const mobileUser = req.user;

    const call = await mobileCallHistoryModel.findOne({ callId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (call.calleeId.toString() !== mobileUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not the callee for this call'
      });
    }

    if (!['pending', 'ringing'].includes(call.status)) {
      return res.status(400).json({
        success: false,
        message: `Call cannot be rejected. Current status: ${call.status}`
      });
    }

    // Reject the call
    await call.rejectCall();
    call.metadata = { ...call.metadata, rejectReason: reason || 'declined' };
    await call.save();

    res.status(200).json({
      success: true,
      message: 'Call rejected',
      data: {
        callId: call.callId,
        status: call.status
      }
    });
  } catch (error) {
    console.error('Reject call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject call',
      error: error.message
    });
  }
};

/**
 * End ongoing call (from mobile)
 * POST /api/mobile/calls/:callId/end
 */
export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const mobileUser = req.user;

    const call = await mobileCallHistoryModel.findOne({ callId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify mobile user is the callee
    if (call.calleeId.toString() !== mobileUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this call'
      });
    }

    // End the call
    await call.endCall();

    res.status(200).json({
      success: true,
      message: 'Call ended',
      data: {
        callId: call.callId,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime
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
 * Get call details
 * GET /api/mobile/calls/:callId
 */
export const getCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const mobileUser = req.user;

    const call = await mobileCallHistoryModel.findOne({ callId })
      .select('-callerToken -calleeToken');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify mobile user is the callee
    if (call.calleeId.toString() !== mobileUser._id.toString()) {
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
 * Get mobile user's call history
 * GET /api/mobile/calls/history
 */
export const getCallHistory = async (req, res) => {
  try {
    const mobileUser = req.user;
    const { limit = 50, skip = 0, status } = req.query;

    const query = { calleeId: mobileUser._id };
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

/**
 * Get pending/ringing calls for mobile user
 * GET /api/mobile/calls/pending
 */
export const getPendingCalls = async (req, res) => {
  try {
    const mobileUser = req.user;

    const calls = await mobileCallHistoryModel.find({
      calleeId: mobileUser._id,
      status: { $in: ['pending', 'ringing'] }
    })
      .select('-callerToken -calleeToken')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: calls
    });
  } catch (error) {
    console.error('Get pending calls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending calls',
      error: error.message
    });
  }
};

