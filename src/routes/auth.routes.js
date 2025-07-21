const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

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
    },
    timestamp: new Date().toISOString(),
  });
}));

module.exports = router;