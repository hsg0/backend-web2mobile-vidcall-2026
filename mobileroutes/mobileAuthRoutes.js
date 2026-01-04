// mobileroutes/mobileAuthRoutes.js

import { Router } from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  refreshToken,
  forgotPassword,
  resetPassword
} from '../mobilecontrollers/mobileAuthController.js';
import { verifyMobileToken } from '../mobilemiddleware/mobileUserAuth.js';

const router = Router();

/**
 * Mobile Auth Routes
 * Base path: /api/mobile/auth
 */

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refreshToken);

// Protected routes (require Bearer token)
router.post('/logout', verifyMobileToken, logout);
router.get('/profile', verifyMobileToken, getProfile);
router.patch('/profile', verifyMobileToken, updateProfile);

export default router;

