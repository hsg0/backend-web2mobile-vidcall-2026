// mobileroutes/mobileCallRoutes.js

import { Router } from 'express';
import {
  acceptCall,
  rejectCall,
  endCall,
  getCall,
  getCallHistory,
  getPendingCalls
} from '../mobilecontrollers/mobileCallController.js';
import { verifyMobileToken } from '../mobilemiddleware/mobileUserAuth.js';

const router = Router();

/**
 * Mobile Calls Routes
 * Base path: /api/mobile/calls
 */

// All routes require mobile authentication
router.use(verifyMobileToken);

// GET /api/mobile/calls/history - Get mobile user's call history
router.get('/history', getCallHistory);

// GET /api/mobile/calls/pending - Get pending/ringing calls
router.get('/pending', getPendingCalls);

// GET /api/mobile/calls/:callId - Get call details
router.get('/:callId', getCall);

// POST /api/mobile/calls/:callId/accept - Accept incoming call
router.post('/:callId/accept', acceptCall);

// POST /api/mobile/calls/:callId/reject - Reject incoming call
router.post('/:callId/reject', rejectCall);

// POST /api/mobile/calls/:callId/end - End ongoing call
router.post('/:callId/end', endCall);

export default router;

