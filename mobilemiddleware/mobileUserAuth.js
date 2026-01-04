// mobilemiddleware/mobileUserAuth.js

import jwt from 'jsonwebtoken';
import mobileUserModel from '../mobilemodels/mobileUserModel.js';
import { isTokenBlacklisted } from '../mobileconfig/mobileTokenBlacklist.js';

/**
 * Mobile User Authentication Middleware
 * Uses Bearer token in Authorization header (for React Native/Expo apps)
 */

/**
 * Verify mobile user JWT from Authorization header
 */
export const verifyMobileToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.slice(7);

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please log in again.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure it's a mobile token
    if (decoded.type !== 'mobile') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }
    
    // Get user from database
    const user = await mobileUserModel.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    req.mobileUser = { mobileUserId: user._id };
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * Optional mobile auth - continues even without valid token
 */
export const optionalMobileAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      // Check if token is blacklisted
      if (isTokenBlacklisted(token)) {
        req.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type === 'mobile') {
        const user = await mobileUserModel.findById(decoded.id);
        if (user && user.isActive) {
          req.user = user;
          req.mobileUser = { mobileUserId: user._id };
          req.userId = user._id;
        }
      }
    }
  } catch (error) {
    req.user = null;
  }
  next();
};

/**
 * Generate JWT token for mobile user
 */
export const generateMobileToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'mobile' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.MOBILE_JWT_EXPIRES_IN || '30d' }
  );
};

/**
 * Generate refresh token for mobile user
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'mobile_refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'mobile_refresh') {
      return null;
    }
    
    const user = await mobileUserModel.findById(decoded.id);
    
    if (!user || user.refreshToken !== refreshToken) {
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
};

// Alias for compatibility
export const mobileUserAuth = verifyMobileToken;

export default verifyMobileToken;

