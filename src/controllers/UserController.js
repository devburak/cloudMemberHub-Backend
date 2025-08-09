const { asyncHandler } = require('../middleware/error.middleware');
const { AppError } = require('../middleware/error.middleware');
const UserService = require('../services/UserService');
const logger = require('../utils/logger');

class UserController {
  constructor() {
    // Service will be injected via dependency injection
    this.userService = null;
  }

  setUserService(userService) {
    this.userService = userService;
  }

  create = asyncHandler(async (req, res) => {
    const { tenantId, userId: requestingUserId } = req;
    const userData = req.body;

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const user = await this.userService.create(userData, tenantId);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user,
    });
  });

  getAll = asyncHandler(async (req, res) => {
    const { tenantId, userId: requestingUserId } = req;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      role: req.query.role,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      search: req.query.search,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      requestingUserId,
    };

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const result = await this.userService.getAll(tenantId, options);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.users,
      pagination: result.pagination,
    });
  });

  getById = asyncHandler(async (req, res) => {
    const { tenantId } = req;
    const { userId } = req.params;

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const user = await this.userService.getById(userId, tenantId);

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      user,
    });
  });

  update = asyncHandler(async (req, res) => {
    const { tenantId, userId: requestingUserId } = req;
    const { userId } = req.params;
    const updateData = req.body;

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const user = await this.userService.update(
      userId, 
      updateData, 
      tenantId, 
      requestingUserId
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  });

  delete = asyncHandler(async (req, res) => {
    const { tenantId, userId: requestingUserId } = req;
    const { userId } = req.params;

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const result = await this.userService.delete(userId, tenantId, requestingUserId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  activate = asyncHandler(async (req, res) => {
    const { tenantId, userId: requestingUserId } = req;
    const { userId } = req.params;

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const result = await this.userService.activate(userId, tenantId, requestingUserId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  deactivate = asyncHandler(async (req, res) => {
    const { tenantId, userId: requestingUserId } = req;
    const { userId } = req.params;

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const result = await this.userService.deactivate(userId, tenantId, requestingUserId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  updateRole = asyncHandler(async (req, res) => {
    const { tenantId, userId: requestingUserId } = req;
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      throw new AppError('Role is required', 400);
    }

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const result = await this.userService.updateRole(
      userId, 
      role, 
      tenantId, 
      requestingUserId
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  updatePermissions = asyncHandler(async (req, res) => {
    const { tenantId, userId: requestingUserId } = req;
    const { userId } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      throw new AppError('Permissions array is required', 400);
    }

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const result = await this.userService.updatePermissions(
      userId, 
      permissions, 
      tenantId, 
      requestingUserId
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  getProfile = asyncHandler(async (req, res) => {
    const { tenantId, userId } = req;

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const profile = await this.userService.getProfile(userId, tenantId);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      profile,
    });
  });

  updateProfile = asyncHandler(async (req, res) => {
    const { tenantId, userId } = req;
    const profileData = req.body;

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const user = await this.userService.updateProfile(userId, profileData, tenantId);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  });

  changePassword = asyncHandler(async (req, res) => {
    const { tenantId, userId } = req;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const result = await this.userService.changePassword(
      userId, 
      currentPassword, 
      newPassword, 
      tenantId
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  searchUsers = asyncHandler(async (req, res) => {
    const { tenantId } = req;
    const { q: searchTerm } = req.query;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      role: req.query.role,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
    };

    if (!searchTerm) {
      throw new AppError('Search term is required', 400);
    }

    if (!this.userService) {
      throw new AppError('User service not available', 500);
    }

    const result = await this.userService.searchUsers(tenantId, searchTerm, options);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: result.users,
      pagination: result.pagination,
    });
  });
}

module.exports = new UserController();