const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');
const { authenticateToken, requireAuth } = require('../middleware/auth.middleware');
const UserController = require('../controllers/UserController');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);
router.use(requireAuth);

// User management routes (admin only routes would need additional middleware)
router.get('/', UserController.getAll);
router.post('/', UserController.create);
router.get('/search', UserController.searchUsers);
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.post('/change-password', UserController.changePassword);

// User-specific routes
router.get('/:userId', UserController.getById);
router.put('/:userId', UserController.update);
router.delete('/:userId', UserController.delete);
router.post('/:userId/activate', UserController.activate);
router.post('/:userId/deactivate', UserController.deactivate);
router.put('/:userId/role', UserController.updateRole);
router.put('/:userId/permissions', UserController.updatePermissions);

// Info route
router.get('/info/endpoints', asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User routes available',
    endpoints: {
      getAllUsers: 'GET /api/users',
      createUser: 'POST /api/users',
      searchUsers: 'GET /api/users/search',
      getUserProfile: 'GET /api/users/profile',
      updateProfile: 'PUT /api/users/profile',
      changePassword: 'POST /api/users/change-password',
      getUserById: 'GET /api/users/:userId',
      updateUser: 'PUT /api/users/:userId',
      deleteUser: 'DELETE /api/users/:userId',
      activateUser: 'POST /api/users/:userId/activate',
      deactivateUser: 'POST /api/users/:userId/deactivate',
      updateUserRole: 'PUT /api/users/:userId/role',
      updateUserPermissions: 'PUT /api/users/:userId/permissions',
    },
    timestamp: new Date().toISOString(),
  });
}));

module.exports = router;