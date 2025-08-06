const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { asyncHandler } = require('../middleware/error.middleware');


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


router.post('/register', authController.register); 
router.post('/login', authController.login ); 
router.post('/logout', authController.logout ); 
router.post('/refreshToken', authController.refreshToken ); 
router.post('/forgotPassword', authController.forgotPassword ); 
router.post('/resetPassword', authController.resetPassword ); 
router.post('/verifyEmail', authController.verifyEmail ); 

module.exports = router;