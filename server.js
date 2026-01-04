// server.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Universal MongoDB connection (single connection with useDb)
import universalMongoDbConnect from './universalconfig/universalMongoDbConnect.js';

// ------------------- WEB ROUTES -------------------
import webAuthRoutes from './webroutes/webAuthRoutes.js';
import webCallRoutes from './webroutes/webCallRoutes.js';
import webTokenRoutes from './webroutes/webTokenRoutes.js';

// ------------------- MOBILE ROUTES -------------------
import mobileAuthRoutes from './mobileroutes/mobileAuthRoutes.js';
import mobileUserRoutes from './mobileroutes/mobileUserRoutes.js';
import mobileCallRoutes from './mobileroutes/mobileCallRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB (web and mobile databases via useDb)
universalMongoDbConnect();

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        // --- DEV ORIGINS ---
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://192.168.0.120:19006",
        "http://192.168.0.120:3000",
        "http://192.168.0.120:8081",
        "http://192.168.0.104:19006",
        "http://192.168.0.105:19006",
        "http://192.168.0.100:19006",
        "http://192.168.0.100:19000",

        // --- PRODUCTION ORIGINS (add your deployed domains) ---
        // "https://www.yourdomain.com",
        // "https://app.yourdomain.com",
        // "https://api.yourdomain.com",
      ];

      // Allow requests with no origin (native iOS/Android app, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS blocked: " + origin));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Health check / root route
app.get('/', (req, res) => {
  res.send('Hello from VidCall Backend! Web-to-Mobile Video Calling API');
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Mobile and web databases are online'
  });
});


// =============================================================================
// WEB ROUTES (Cookie-based auth for Next.js frontend)
// These routes are for web users who INITIATE video calls to mobile users
// =============================================================================

// Road for signing up, logging in, logging out, OTP verification, password reset
app.use('/api/web/auth', webAuthRoutes);

// Road for web user to INITIATE VIDEO CALLS to mobile users
// - GET /api/web/calls/mobile-users - List available mobile users to call (by mobileUserId or email)
// - POST /api/web/calls/initiate - Start a call to a mobile user
// - POST /api/web/calls/:callId/end - End an ongoing call
// - POST /api/web/calls/:callId/miss - Mark call as missed (timeout)
// - GET /api/web/calls/history - Get web user's call history
app.use('/api/web/calls', webCallRoutes);

// Road for generating Agora tokens (RTC/RTM for video and chat)
app.use('/api/web/token', webTokenRoutes);


// =============================================================================
// MOBILE ROUTES (Bearer token auth for Expo/React Native app)
// These routes are for mobile users who RECEIVE video calls from web users
// =============================================================================

// Road for mobile login, register, logout, OTP password reset
app.use('/api/mobile/auth', mobileAuthRoutes);

// Road for mobile user actions:
// - POST /api/mobile/users/register-device - Register Expo push token
// - PATCH /api/mobile/users/push-token - Update push token
// - PATCH /api/mobile/users/status - Update online/offline status
// - DELETE /api/mobile/users/device - Unregister device
app.use('/api/mobile/users', mobileUserRoutes);

// Road for mobile user to RECEIVE VIDEO CALLS from web users
// - GET /api/mobile/calls/pending - Get pending/ringing calls
// - GET /api/mobile/calls/history - Get mobile user's call history
// - POST /api/mobile/calls/:callId/accept - Accept incoming call
// - POST /api/mobile/calls/:callId/reject - Reject incoming call
// - POST /api/mobile/calls/:callId/end - End ongoing call
app.use('/api/mobile/calls', mobileCallRoutes);


// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    hint: 'Web routes: /api/web/*, Mobile routes: /api/mobile/*'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});


// =============================================================================
// START THE SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`🚍 Server is running on http://192.168.0.120:${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📞 Video Call Flow:');
  console.log('   Web Caller (Next.js) → Backend → Push Notification → Mobile Receiver (Expo)');
  console.log('');
  console.log('🛣️  API Routes:');
  console.log('   Web:    /api/web/auth, /api/web/calls, /api/web/token');
  console.log('   Mobile: /api/mobile/auth, /api/mobile/users, /api/mobile/calls');
});

export default app;
