// mobileRecieverAgora/mobileRecieverAgoraService.js

import { generateMobileRecieverRtcToken, generateMobileRecieverRtmToken, AGORA_APP_ID } from './mobileRecieverAgora.js';

/**
 * Mobile Receiver Agora Service
 * Handles Agora token generation for mobile receiver accepting video calls
 */
class MobileRecieverAgoraService {
  constructor() {
    this.appId = AGORA_APP_ID;
  }

  /**
   * Generate RTC token for mobile receiver accepting a call
   * @param {string} channelName - Channel name
   * @param {string} userId - Mobile user ID
   * @param {string} role - 'publisher' or 'subscriber'
   * @returns {Object} Token info
   */
  generateRtcTokenForUser(channelName, userId, role = 'publisher') {
    const uid = this._generateUid(userId);
    return {
      channelName,
      uid,
      token: generateMobileRecieverRtcToken(channelName, uid, role),
      appId: this.appId
    };
  }

  /**
   * Generate RTM token for mobile receiver in-call chat
   * @param {string} userId - User ID
   * @returns {Object} RTM token info
   */
  generateRtmTokenForUser(userId) {
    return {
      userId,
      token: generateMobileRecieverRtmToken(userId),
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

export default new MobileRecieverAgoraService();

