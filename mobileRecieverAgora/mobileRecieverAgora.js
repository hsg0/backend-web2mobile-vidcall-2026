// mobileRecieverAgora/mobileRecieverAgora.js

import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } = pkg;

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Default token expiration time (24 hours)
const DEFAULT_EXPIRATION_TIME = 86400;

/**
 * Generate RTC token for mobile receiver video/audio calling
 * @param {string} channelName - Agora channel name
 * @param {number|string} uid - User ID (0 for string UID)
 * @param {string} role - 'publisher' or 'subscriber'
 * @param {number} expirationTime - Token expiration in seconds
 * @returns {string} RTC token
 */
export const generateMobileRecieverRtcToken = (channelName, uid, role = 'publisher', expirationTime = DEFAULT_EXPIRATION_TIME) => {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error('Agora credentials not configured');
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expirationTime;

  const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  // Use buildTokenWithUid for numeric UID, buildTokenWithAccount for string UID
  const token = typeof uid === 'number'
    ? RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        rtcRole,
        privilegeExpireTime
      )
    : RtcTokenBuilder.buildTokenWithAccount(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        rtcRole,
        privilegeExpireTime
      );

  return token;
};

/**
 * Generate RTM token for mobile receiver real-time messaging (in-call chat)
 * @param {string} userId - User ID for RTM
 * @param {number} expirationTime - Token expiration in seconds
 * @returns {string} RTM token
 */
export const generateMobileRecieverRtmToken = (userId, expirationTime = DEFAULT_EXPIRATION_TIME) => {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error('Agora credentials not configured');
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expirationTime;

  const token = RtmTokenBuilder.buildToken(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    userId,
    RtmRole.Rtm_User,
    privilegeExpireTime
  );

  return token;
};

export { AGORA_APP_ID };

