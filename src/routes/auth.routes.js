const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');
const { authenticateToken, requireAuth } = require('../middleware/auth.middleware');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerificationEmail);
router.post('/validate-token', AuthController.validateToken);

// Protected routes (authentication required)
router.use(authenticateToken);
router.use(requireAuth);

router.post('/logout', AuthController.logout);
router.post('/change-password', AuthController.changePassword);
router.get('/profile', AuthController.getProfile);
router.get('/sessions', AuthController.getUserSessions);
router.post('/revoke-sessions', AuthController.revokeAllSessions);

// Info route
router.get('/', asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes available',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      refresh: 'POST /api/auth/refresh',
      forgotPassword: 'POST /api/auth/forgot-password',
      resetPassword: 'POST /api/auth/reset-password',
      verifyEmail: 'POST /api/auth/verify-email',
      resendVerification: 'POST /api/auth/resend-verification',
      changePassword: 'POST /api/auth/change-password',
      validateToken: 'POST /api/auth/validate-token',
      profile: 'GET /api/auth/profile',
      sessions: 'GET /api/auth/sessions',
      revokeSessions: 'POST /api/auth/revoke-sessions',
    },
    timestamp: new Date().toISOString(),
  });
}));

module.exports = router;