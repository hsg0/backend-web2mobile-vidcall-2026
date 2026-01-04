// mobileconfig/mobileTokenBlacklist.js
// In-memory token blacklist for mobile logout
// For production, consider using Redis for persistence across server restarts

const blacklistedTokens = new Map();

// Clean up expired tokens every 30 minutes
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * Blacklist a token so it cannot be used again
 * @param {string} token - The JWT token to blacklist
 * @param {number} expSeconds - Token expiration time in seconds (from JWT exp claim)
 */
export const blacklistToken = (token, expSeconds) => {
  if (!token) return;
  
  // Calculate when this token expires
  // If expSeconds is undefined, default to 30 days from now
  const expiresAt = expSeconds 
    ? expSeconds * 1000 // Convert seconds to milliseconds
    : Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  
  blacklistedTokens.set(token, expiresAt);
};

/**
 * Check if a token is blacklisted
 * @param {string} token - The JWT token to check
 * @returns {boolean} - True if blacklisted, false otherwise
 */
export const isTokenBlacklisted = (token) => {
  if (!token) return false;
  return blacklistedTokens.has(token);
};

/**
 * Remove expired tokens from the blacklist
 */
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [token, expiresAt] of blacklistedTokens.entries()) {
    if (expiresAt < now) {
      blacklistedTokens.delete(token);
    }
  }
};

// Start cleanup interval
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);

// Export for testing
export const getBlacklistSize = () => blacklistedTokens.size;

