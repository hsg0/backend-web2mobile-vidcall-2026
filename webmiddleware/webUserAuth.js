// webmiddleware/webUserAuth.js

import jwt from 'jsonwebtoken';
import webUserModel from '../webmodels/webUserModel.js';

/**
 * Web User Authentication Middleware
 * Uses HTTP-only cookies for JWT storage (more secure for web apps)
 */

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 1 day
};

/**
 * Verify web user JWT from cookie
 */
export const verifyWebToken = async (req, res, next) => {
  try {
    const token = req.cookies[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await webUserModel.findById(decoded.id || decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Clear expired cookie
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid session'
    });
  }
};

/**
 * Optional web auth - continues even without valid token
 */
export const optionalWebAuth = async (req, res, next) => {
  try {
    const token = req.cookies[COOKIE_NAME];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await webUserModel.findById(decoded.id || decoded.userId);
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    }
  } catch (error) {
    // Token invalid but continue anyway
    req.user = null;
  }
  next();
};

/**
 * Generate JWT token for web user
 */
export const generateWebToken = (userId) => {
  return jwt.sign(
    { id: userId, userId: userId, type: 'web' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

/**
 * Set auth cookie
 */
export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
};

/**
 * Clear auth cookie
 */
export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
};

// Alias for compatibility
export const webUserAuth = verifyWebToken;

export { COOKIE_NAME };

export default verifyWebToken;

