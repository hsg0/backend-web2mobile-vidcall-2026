// mobilecontrollers/mobileUserController.js

import mobileUserModel from '../mobilemodels/mobileUserModel.js';

/**
 * Mobile User Controller
 * Handles device registration and status updates
 */

/**
 * Register device token for push notifications (Expo)
 * POST /api/mobile/users/register-device
 */
export const registerDevice = async (req, res) => {
  try {
    const { expoPushToken, platform } = req.body;
    const user = req.user;

    if (!expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'expoPushToken is required'
      });
    }

    // Platform is optional, validate if provided
    if (platform && !['ios', 'android'].includes(platform.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Platform must be "ios" or "android"'
      });
    }

    await user.registerDevice(expoPushToken, platform?.toLowerCase() || null);

    res.status(200).json({
      success: true,
      message: 'Device registered successfully',
      data: {
        expoPushToken: user.expoPushToken,
        platform: user.platform
      }
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device',
      error: error.message
    });
  }
};

/**
 * Update online status
 * PATCH /api/mobile/users/status
 */
export const updateStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const user = req.user;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isOnline must be a boolean'
      });
    }

    await user.setOnlineStatus(isOnline);

    res.status(200).json({
      success: true,
      message: 'Status updated',
      data: {
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

/**
 * Unregister device (clear push token)
 * DELETE /api/mobile/users/device
 */
export const unregisterDevice = async (req, res) => {
  try {
    const user = req.user;

    user.expoPushToken = null;
    user.platform = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Device unregistered'
    });
  } catch (error) {
    console.error('Unregister device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister device'
    });
  }
};

/**
 * Update Expo push token
 * PATCH /api/mobile/users/push-token
 */
export const updatePushToken = async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const user = req.user;

    if (!expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'expoPushToken is required'
      });
    }

    user.expoPushToken = expoPushToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Push token updated',
      data: {
        expoPushToken: user.expoPushToken
      }
    });
  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update push token',
      error: error.message
    });
  }
};

