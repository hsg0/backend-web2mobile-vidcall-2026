// webcontrollers/webTokenController.js

import webCallerAgoraService from '../webCallerAgora/webCallerAgoraService.js';
import { generateWebCallerRtmToken, AGORA_APP_ID } from '../webCallerAgora/webCallerAgora.js';

/**
 * Web Token Controller
 * Handles Agora RTC and RTM token generation for web caller
 */

/**
 * Generate RTC token for video calling
 * POST /api/web/token/rtc
 */
export const generateRtcToken = async (req, res) => {
  try {
    const { channelName, userId, role = 'publisher' } = req.body;

    if (!channelName || !userId) {
      return res.status(400).json({
        success: false,
        message: 'channelName and userId are required'
      });
    }

    const tokenData = webCallerAgoraService.generateRtcTokenForUser(channelName, userId, role);

    res.status(200).json({
      success: true,
      data: tokenData
    });
  } catch (error) {
    console.error('Generate RTC token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate RTC token',
      error: error.message
    });
  }
};

/**
 * Generate RTM token for messaging/chat
 * POST /api/web/token/rtm
 */
export const generateRtmToken = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const tokenData = webCallerAgoraService.generateRtmTokenForUser(userId);

    res.status(200).json({
      success: true,
      data: tokenData
    });
  } catch (error) {
    console.error('Generate RTM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate RTM token',
      error: error.message
    });
  }
};

/**
 * Generate both RTC and RTM tokens for a call
 * POST /api/web/token/call
 */
export const generateCallTokens = async (req, res) => {
  try {
    const { channelName, callerId, calleeId } = req.body;

    if (!channelName || !callerId || !calleeId) {
      return res.status(400).json({
        success: false,
        message: 'channelName, callerId, and calleeId are required'
      });
    }

    const tokens = webCallerAgoraService.generateCallTokens(channelName, callerId, calleeId);

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Generate call tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate call tokens',
      error: error.message
    });
  }
};

/**
 * Get chat credentials for in-call messaging
 * POST /api/web/token/chat
 */
export const getChatCredentials = async (req, res) => {
  try {
    const { channelName, userId } = req.body;

    if (!channelName || !userId) {
      return res.status(400).json({
        success: false,
        message: 'channelName and userId are required'
      });
    }

    const credentials = {
      appId: AGORA_APP_ID,
      channelName: channelName,
      userId: userId,
      token: generateWebCallerRtmToken(userId)
    };

    res.status(200).json({
      success: true,
      data: credentials
    });
  } catch (error) {
    console.error('Get chat credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat credentials',
      error: error.message
    });
  }
};

