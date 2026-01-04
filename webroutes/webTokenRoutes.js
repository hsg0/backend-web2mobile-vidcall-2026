// webroutes/webTokenRoutes.js

import { Router } from 'express';
import {
  generateRtcToken,
  generateRtmToken,
  generateCallTokens,
  getChatCredentials
} from '../webcontrollers/webTokenController.js';

const router = Router();

/**
 * Web Token Routes
 * Base path: /api/web/token
 */

// POST /api/web/token/rtc - Generate RTC token for video calling
router.post('/rtc', generateRtcToken);

// POST /api/web/token/rtm - Generate RTM token for messaging
router.post('/rtm', generateRtmToken);

// POST /api/web/token/call - Generate both RTC and RTM tokens for a call
router.post('/call', generateCallTokens);

// POST /api/web/token/chat - Get chat credentials for in-call messaging
router.post('/chat', getChatCredentials);

export default router;

