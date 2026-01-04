// webCallerAgora/webCallerAgoraService.js

import { generateWebCallerRtcToken, generateWebCallerRtmToken, AGORA_APP_ID } from './webCallerAgora.js';

/**
 * Web Caller Agora Service
 * Handles Agora token generation for web caller initiating video calls
 */
class WebCallerAgoraService {
  constructor() {
    this.appId = AGORA_APP_ID;
  }

  /**
   * Generate tokens for web caller initiating a call
   * @param {string} channelName - Agora channel name
   * @param {string} callerId - Web caller user ID
   * @param {string} calleeId - Mobile callee user ID
   * @returns {Object} Tokens for caller and callee
   */
  generateCallTokens(channelName, callerId, calleeId) {
    const callerUid = this._generateUid(callerId);
    const calleeUid = this._generateUid(calleeId);

    return {
      channelName,
      caller: {
        uid: callerUid,
        rtcToken: generateWebCallerRtcToken(channelName, callerUid, 'publisher'),
        rtmToken: generateWebCallerRtmToken(callerId)
      },
      callee: {
        uid: calleeUid,
        rtcToken: generateWebCallerRtcToken(channelName, calleeUid, 'publisher'),
        rtmToken: generateWebCallerRtmToken(calleeId)
      },
      appId: this.appId
    };
  }

  /**
   * Generate RTC token for web caller
   * @param {string} channelName - Channel name
   * @param {string} userId - User ID
   * @param {string} role - 'publisher' or 'subscriber'
   * @returns {Object} Token info
   */
  generateRtcTokenForUser(channelName, userId, role = 'publisher') {
    const uid = this._generateUid(userId);
    return {
      channelName,
      uid,
      token: generateWebCallerRtcToken(channelName, uid, role),
      appId: this.appId
    };
  }

  /**
   * Generate RTM token for web caller in-call chat
   * @param {string} userId - User ID
   * @returns {Object} RTM token info
   */
  generateRtmTokenForUser(userId) {
    return {
      userId,
      token: generateWebCallerRtmToken(userId),
      appId: this.appId
    };
  }

  /**
   * Generate a numeric UID from string user ID
   * @param {string} userId - User ID string
   * @returns {number} Numeric UID
   */
  _generateUid(userId) {
    // Generate a hash-based numeric UID from user ID string
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive and within Agora UID range (1 to 2^32-1)
    return Math.abs(hash) % 4294967295 || 1;
  }
}

export default new WebCallerAgoraService();

