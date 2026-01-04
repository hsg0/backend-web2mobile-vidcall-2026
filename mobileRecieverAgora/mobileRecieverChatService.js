// mobileRecieverAgora/mobileRecieverChatService.js

import { generateMobileRecieverRtmToken, AGORA_APP_ID } from './mobileRecieverAgora.js';

/**
 * Mobile Receiver Chat Service
 * Handles Agora RTM (Real-Time Messaging) for in-call chat functionality on mobile
 */
class MobileRecieverChatService {
  constructor() {
    this.appId = AGORA_APP_ID;
  }

  /**
   * Generate RTM credentials for mobile user to join chat
   * @param {string} userId - User ID
   * @returns {Object} RTM credentials
   */
  getRtmCredentials(userId) {
    return {
      appId: this.appId,
      userId: userId,
      token: generateMobileRecieverRtmToken(userId)
    };
  }

  /**
   * Generate channel-specific chat credentials for mobile user
   * @param {string} channelName - Call channel name (used as RTM channel)
   * @param {string} userId - User ID
   * @returns {Object} Chat credentials for the call
   */
  getCallChatCredentials(channelName, userId) {
    return {
      appId: this.appId,
      channelName: channelName,
      userId: userId,
      token: generateMobileRecieverRtmToken(userId)
    };
  }
}

export default new MobileRecieverChatService();

