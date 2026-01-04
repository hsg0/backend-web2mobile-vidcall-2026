// webroutes/webCallRoutes.js

import { Router } from 'express';
import {
  listMobileUsers,
  searchMobileUser,
  initiateCall,
  endCall,
  missCall,
  getCall,
  getCallHistory
} from '../webcontrollers/webCallController.js';
import { verifyWebToken } from '../webmiddleware/webUserAuth.js';

const router = Router();

/**
 * Web Calls Routes
 * Base path: /api/web/calls
 * All routes require web authentication (cookie-based JWT)
 */

// All routes require web authentication
router.use(verifyWebToken);

// GET /api/web/calls/mobile-users - List mobile users available to call
// Query: ?online=true for only online users
router.get('/mobile-users', listMobileUsers);

// GET /api/web/calls/search - Search for a mobile user by mobileUserId or email
// Query: ?mobileUserId=xxx OR ?email=xxx@example.com
router.get('/search', searchMobileUser);

// GET /api/web/calls/history - Get web user's outgoing call history
router.get('/history', getCallHistory);

// POST /api/web/calls/initiate - Initiate call to mobile user
// Body: { mobileUserId: "xxx" } OR { email: "xxx@example.com" }
router.post('/initiate', initiateCall);

// GET /api/web/calls/:callId - Get specific call details
router.get('/:callId', getCall);

// POST /api/web/calls/:callId/end - End an ongoing call
router.post('/:callId/end', endCall);

// POST /api/web/calls/:callId/miss - Mark call as missed (timeout)
router.post('/:callId/miss', missCall);

export default router;
