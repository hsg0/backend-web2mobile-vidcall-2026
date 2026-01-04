// webroutes/webAuthRoutes.js

import { Router } from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  sendVerifyOtp,
  verifyEmail,
  isAuthenticated,
  getUserData
} from '../webcontrollers/webAuthController.js';
import { verifyWebToken } from '../webmiddleware/webUserAuth.js';

const router = Router();

/**
 * Web Auth Routes
 * Base path: /api/web/auth
 */

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/send-reset-otp', forgotPassword); // Alias
router.post('/reset-password', resetPassword);

// Protected routes (require auth cookie)
router.post('/logout', verifyWebToken, logout);
router.get('/profile', verifyWebToken, getProfile);
router.get('/user-data', verifyWebToken, getUserData);
router.patch('/profile', verifyWebToken, updateProfile);

// OTP Verification routes (protected)
router.post('/send-verify-otp', verifyWebToken, sendVerifyOtp);
router.post('/verify-email', verifyWebToken, verifyEmail);
router.get('/is-authenticated', verifyWebToken, isAuthenticated);

export default router;

