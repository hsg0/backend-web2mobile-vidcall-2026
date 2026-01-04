// mobileroutes/mobileUserRoutes.js

import { Router } from 'express';
import {
  registerDevice,
  updateStatus,
  unregisterDevice,
  updatePushToken
} from '../mobilecontrollers/mobileUserController.js';
import { verifyMobileToken } from '../mobilemiddleware/mobileUserAuth.js';

const router = Router();

/**
 * Mobile User Routes
 * Base path: /api/mobile/users
 * All routes require authentication
 */

// Device registration
router.post('/register-device', verifyMobileToken, registerDevice);
router.patch('/push-token', verifyMobileToken, updatePushToken);
router.delete('/device', verifyMobileToken, unregisterDevice);

// Status updates
router.patch('/status', verifyMobileToken, updateStatus);

export default router;

