// mobileRecieverAgora/mobileRecieverPushNotification.js

/**
 * Mobile Receiver Push Notification Service
 * Handles sending push notifications via Expo Push Notifications API
 * No Firebase setup required - works directly with Expo apps
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

class MobileRecieverPushNotificationService {
  constructor() {
    // No initialization needed for Expo Push
  }

  /**
   * Validate Expo push token format
   * @param {string} token - Push token to validate
   * @returns {boolean} Whether token is valid Expo format
   */
  isValidExpoPushToken(token) {
    return typeof token === 'string' && 
           (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
  }

  /**
   * Send incoming call notification to mobile device
   * Shows: "Incoming Video Call from [callerName] ([callerEmail])"
   * @param {string} expoPushToken - Expo push token
   * @param {Object} callData - Call information
   * @returns {Promise<Object>} Send result
   */
  async sendIncomingCallNotification(expoPushToken, callData) {
    const { callId, channelName, callerId, callerName, callerEmail, appId, token } = callData;

    if (!this.isValidExpoPushToken(expoPushToken)) {
      console.warn('Invalid Expo push token format:', expoPushToken);
      return { success: false, error: 'Invalid Expo push token format' };
    }

    // Build notification body with caller info
    // Shows: "John Doe (john@example.com) is calling you..."
    // Or if no name: "john@example.com is calling you..."
    let callerDisplay = callerName || 'Unknown';
    if (callerEmail && callerName && callerName !== callerEmail) {
      callerDisplay = `${callerName} (${callerEmail})`;
    } else if (callerEmail) {
      callerDisplay = callerEmail;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: 'Incoming Video Call',
      body: `${callerDisplay} is calling you...`,
      priority: 'high',
      channelId: 'video_calls',
      data: {
        type: 'INCOMING_CALL',
        callId: callId,
        channelName: channelName,
        callerId: callerId,
        callerName: callerName || 'Unknown Caller',
        callerEmail: callerEmail || '',
        appId: appId || '',
        token: token || '',
        timestamp: Date.now().toString()
      }
    };

    return this._sendPushNotification(message);
  }

  /**
   * Send call ended notification
   * @param {string} expoPushToken - Expo push token
   * @param {Object} callData - Call information
   * @returns {Promise<Object>} Send result
   */
  async sendCallEndedNotification(expoPushToken, callData) {
    const { callId, reason } = callData;

    if (!this.isValidExpoPushToken(expoPushToken)) {
      return { success: false, error: 'Invalid Expo push token format' };
    }

    const message = {
      to: expoPushToken,
      priority: 'high',
      data: {
        type: 'CALL_ENDED',
        callId: callId,
        reason: reason || 'ended',
        timestamp: Date.now().toString()
      },
      // Silent notification (no visible alert)
      _contentAvailable: true
    };

    return this._sendPushNotification(message);
  }

  /**
   * Send missed call notification
   * Shows: "You missed a call from [callerName] ([callerEmail])"
   * @param {string} expoPushToken - Expo push token
   * @param {Object} callData - Call information
   * @returns {Promise<Object>} Send result
   */
  async sendMissedCallNotification(expoPushToken, callData) {
    const { callId, callerName, callerEmail } = callData;

    if (!this.isValidExpoPushToken(expoPushToken)) {
      return { success: false, error: 'Invalid Expo push token format' };
    }

    // Build caller display with email
    let callerDisplay = callerName || 'Unknown';
    if (callerEmail && callerName && callerName !== callerEmail) {
      callerDisplay = `${callerName} (${callerEmail})`;
    } else if (callerEmail) {
      callerDisplay = callerEmail;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: 'Missed Call',
      body: `You missed a call from ${callerDisplay}`,
      channelId: 'missed_calls',
      data: {
        type: 'MISSED_CALL',
        callId: callId,
        callerName: callerName || 'Unknown',
        callerEmail: callerEmail || '',
        timestamp: Date.now().toString()
      }
    };

    return this._sendPushNotification(message);
  }

  /**
   * Send a single push notification via Expo API
   * @param {Object} message - Expo push message
   * @returns {Promise<Object>} Send result
   */
  async _sendPushNotification(message) {
    return this._sendPushNotifications([message]);
  }

  /**
   * Send multiple push notifications via Expo API
   * @param {Object[]} messages - Array of Expo push messages
   * @returns {Promise<Object>} Send result
   */
  async _sendPushNotifications(messages) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messages)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Expo Push API error:', result);
        return { 
          success: false, 
          error: result.errors?.[0]?.message || 'Failed to send notification' 
        };
      }

      // Check individual ticket statuses
      const tickets = result.data || [];
      const successCount = tickets.filter(t => t.status === 'ok').length;
      const failureCount = tickets.filter(t => t.status === 'error').length;

      console.log(`Push notifications sent: ${successCount} success, ${failureCount} failed`);

      return {
        success: failureCount === 0,
        successCount,
        failureCount,
        tickets
      };
    } catch (error) {
      console.error('Failed to send Expo push notification:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new MobileRecieverPushNotificationService();
