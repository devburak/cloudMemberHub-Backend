const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User routes available',
    endpoints: {
      getAllUsers: 'GET /api/users',
      getUserProfile: 'GET /api/users/profile',
      updateProfile: 'PUT /api/users/profile',
      deleteAccount: 'DELETE /api/users/profile',
    },
    timestamp: new Date().toISOString(),
  });
}));

module.exports = router;