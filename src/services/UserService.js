const IService = require('../shared/interfaces/IService');
const { Injectable } = require('../shared/container/ServiceContainer');
const { AppError } = require('../middleware/error.middleware');
const User = require('../domain/entities/User');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

class UserService extends IService {
  constructor(userRepository, tenantService) {
    super();
    this.userRepository = userRepository;
    this.tenantService = tenantService;
  }

  async create(userData, tenantId) {
    try {
      // Validate tenant exists and has capacity
      await this.validateTenantCapacity(tenantId);

      // Validate user data
      this.validateUserData(userData);

      // Check if user already exists in this tenant
      const existingUser = await User.findOne({
        email: userData.email.toLowerCase(),
        tenantId,
        isDeleted: false
      });

      if (existingUser) {
        throw new AppError('User already exists in this tenant', 409);
      }

      // Create user with tenant association
      const user = new User({
        ...userData,
        tenantId,
        email: userData.email.toLowerCase(),
        isActive: true,
        isEmailVerified: false
      });

      const savedUser = await user.save();

      // Update tenant usage
      if (this.tenantService) {
        await this.tenantService.updateUsage(tenantId, 'users', 1);
      }

      logger.info(`User created successfully: ${savedUser.email} in tenant ${tenantId}`);

      // Return user without password
      return this.sanitizeUser(savedUser);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getById(userId, tenantId) {
    try {
      const user = await User.findOne({
        _id: userId,
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return this.sanitizeUser(user);
    } catch (error) {
      logger.error(`Error getting user ${userId}:`, error);
      throw error;
    }
  }

  async getByEmail(email, tenantId) {
    try {
      const user = await User.findOne({
        email: email.toLowerCase(),
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return this.sanitizeUser(user);
    } catch (error) {
      logger.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  async getAll(tenantId, options = {}) {
    try {
      // Validate tenant access
      await this.validateTenantAccess(tenantId, options.requestingUserId);

      const {
        page = 1,
        limit = 20,
        role,
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = {
        tenantId,
        isDeleted: false
      };

      // Apply filters
      if (role) query.role = role;
      if (typeof isActive === 'boolean') query.isActive = isActive;

      // Apply search
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [users, total] = await Promise.all([
        User.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-password -passwordResetToken -emailVerificationToken')
          .lean(),
        User.countDocuments(query)
      ]);

      return {
        users: users.map(user => this.sanitizeUser(user)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting all users for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async update(userId, updateData, tenantId, requestingUserId) {
    try {
      // Validate user exists and belongs to tenant
      const user = await User.findOne({
        _id: userId,
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Validate update permissions
      await this.validateUpdatePermissions(user, requestingUserId, tenantId);

      // Validate update data
      if (updateData.email && updateData.email !== user.email) {
        await this.validateEmailUniqueness(updateData.email, tenantId, userId);
      }

      // Handle password update separately
      if (updateData.password) {
        await this.updatePassword(user, updateData.password);
        delete updateData.password;
      }

      // Update user
      Object.assign(user, updateData);
      const updatedUser = await user.save();

      logger.info(`User updated successfully: ${userId} in tenant ${tenantId}`);
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      logger.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  }

  async delete(userId, tenantId, requestingUserId) {
    try {
      const user = await User.findOne({
        _id: userId,
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Validate delete permissions
      await this.validateDeletePermissions(user, requestingUserId, tenantId);

      // Soft delete
      await user.softDelete();

      // Update tenant usage
      if (this.tenantService) {
        await this.tenantService.updateUsage(tenantId, 'users', -1);
      }

      logger.info(`User deleted successfully: ${userId} in tenant ${tenantId}`);
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  }

  async activate(userId, tenantId, requestingUserId) {
    try {
      const user = await this.getById(userId, tenantId);
      
      // Validate permissions
      await this.validateAdminPermissions(requestingUserId, tenantId);

      await User.findByIdAndUpdate(userId, { isActive: true });
      
      logger.info(`User activated: ${userId} in tenant ${tenantId}`);
      return { success: true, message: 'User activated successfully' };
    } catch (error) {
      logger.error(`Error activating user ${userId}:`, error);
      throw error;
    }
  }

  async deactivate(userId, tenantId, requestingUserId) {
    try {
      const user = await this.getById(userId, tenantId);
      
      // Validate permissions
      await this.validateAdminPermissions(requestingUserId, tenantId);

      await User.findByIdAndUpdate(userId, { isActive: false });
      
      logger.info(`User deactivated: ${userId} in tenant ${tenantId}`);
      return { success: true, message: 'User deactivated successfully' };
    } catch (error) {
      logger.error(`Error deactivating user ${userId}:`, error);
      throw error;
    }
  }

  async updateRole(userId, newRole, tenantId, requestingUserId) {
    try {
      const user = await this.getById(userId, tenantId);
      
      // Validate permissions - only admins can update roles
      await this.validateAdminPermissions(requestingUserId, tenantId);

      // Validate role
      const validRoles = ['user', 'manager', 'admin', 'tenant_admin'];
      if (!validRoles.includes(newRole)) {
        throw new AppError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
      }

      await User.findByIdAndUpdate(userId, { role: newRole });
      
      logger.info(`User role updated: ${userId} to ${newRole} in tenant ${tenantId}`);
      return { success: true, message: 'User role updated successfully' };
    } catch (error) {
      logger.error(`Error updating user role ${userId}:`, error);
      throw error;
    }
  }

  async updatePermissions(userId, permissions, tenantId, requestingUserId) {
    try {
      const user = await this.getById(userId, tenantId);
      
      // Validate permissions
      await this.validateAdminPermissions(requestingUserId, tenantId);

      // Validate permissions array
      const validPermissions = [
        'users.read', 'users.write', 'users.delete',
        'members.read', 'members.write', 'members.delete',
        'reports.read', 'reports.write',
        'settings.read', 'settings.write',
        'tenant.manage'
      ];

      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        throw new AppError(`Invalid permissions: ${invalidPermissions.join(', ')}`, 400);
      }

      await User.findByIdAndUpdate(userId, { permissions });
      
      logger.info(`User permissions updated: ${userId} in tenant ${tenantId}`);
      return { success: true, message: 'User permissions updated successfully' };
    } catch (error) {
      logger.error(`Error updating user permissions ${userId}:`, error);
      throw error;
    }
  }

  async getProfile(userId, tenantId) {
    try {
      const user = await this.getById(userId, tenantId);
      
      // Return full profile for the user themselves
      return {
        ...this.sanitizeUser(user),
        profile: user.profile,
        preferences: user.preferences,
        tenantRoles: user.tenantRoles
      };
    } catch (error) {
      logger.error(`Error getting user profile ${userId}:`, error);
      throw error;
    }
  }

  async updateProfile(userId, profileData, tenantId) {
    try {
      const user = await User.findOne({
        _id: userId,
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Update profile fields
      if (profileData.firstName) user.firstName = profileData.firstName;
      if (profileData.lastName) user.lastName = profileData.lastName;
      if (profileData.profile) {
        user.profile = { ...user.profile, ...profileData.profile };
      }
      if (profileData.preferences) {
        user.preferences = { ...user.preferences, ...profileData.preferences };
      }

      const updatedUser = await user.save();
      
      logger.info(`User profile updated: ${userId} in tenant ${tenantId}`);
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      logger.error(`Error updating user profile ${userId}:`, error);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword, tenantId) {
    try {
      const user = await User.findOne({
        _id: userId,
        tenantId,
        isDeleted: false
      }).select('+password');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Update password
      await this.updatePassword(user, newPassword);
      
      logger.info(`Password changed for user: ${userId} in tenant ${tenantId}`);
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      logger.error(`Error changing password for user ${userId}:`, error);
      throw error;
    }
  }

  async searchUsers(tenantId, searchTerm, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        isActive
      } = options;

      const query = {
        tenantId,
        isDeleted: false,
        $or: [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (role) query.role = role;
      if (typeof isActive === 'boolean') query.isActive = isActive;

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ firstName: 1, lastName: 1 })
          .skip(skip)
          .limit(limit)
          .select('-password -passwordResetToken -emailVerificationToken')
          .lean(),
        User.countDocuments(query)
      ]);

      return {
        users: users.map(user => this.sanitizeUser(user)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Error searching users in tenant ${tenantId}:`, error);
      throw error;
    }
  }

  // Validation methods
  async validateTenantCapacity(tenantId) {
    if (!this.tenantService) return true;

    try {
      const usageStats = await this.tenantService.getUsageStats(tenantId);
      if (!usageStats.isWithinLimits.users) {
        throw new AppError('Tenant user limit exceeded', 403);
      }
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      // If tenant service fails, continue with user creation
      logger.warn(`Could not validate tenant capacity: ${error.message}`);
      return true;
    }
  }

  async validateTenantAccess(tenantId, requestingUserId) {
    if (!requestingUserId) return true;

    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) {
      throw new AppError('Requesting user not found', 404);
    }

    // Super admin can access any tenant
    if (requestingUser.role === 'super_admin') return true;

    // Check if user belongs to the tenant
    if (requestingUser.tenantId !== tenantId) {
      throw new AppError('Access denied to this tenant', 403);
    }

    return true;
  }

  async validateUpdatePermissions(user, requestingUserId, tenantId) {
    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) {
      throw new AppError('Requesting user not found', 404);
    }

    // Super admin can update anyone
    if (requestingUser.role === 'super_admin') return true;

    // Users can update themselves
    if (user._id.toString() === requestingUserId.toString()) return true;

    // Admins can update users in their tenant
    if (requestingUser.tenantId === tenantId && 
        ['admin', 'tenant_admin'].includes(requestingUser.role)) {
      return true;
    }

    throw new AppError('Insufficient permissions to update this user', 403);
  }

  async validateDeletePermissions(user, requestingUserId, tenantId) {
    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) {
      throw new AppError('Requesting user not found', 404);
    }

    // Super admin can delete anyone
    if (requestingUser.role === 'super_admin') return true;

    // Prevent self-deletion
    if (user._id.toString() === requestingUserId.toString()) {
      throw new AppError('Cannot delete your own account', 400);
    }

    // Admins can delete users in their tenant
    if (requestingUser.tenantId === tenantId && 
        ['admin', 'tenant_admin'].includes(requestingUser.role)) {
      return true;
    }

    throw new AppError('Insufficient permissions to delete this user', 403);
  }

  async validateAdminPermissions(requestingUserId, tenantId) {
    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) {
      throw new AppError('Requesting user not found', 404);
    }

    // Super admin has all permissions
    if (requestingUser.role === 'super_admin') return true;

    // Tenant admins can manage their tenant
    if (requestingUser.tenantId === tenantId && 
        ['admin', 'tenant_admin'].includes(requestingUser.role)) {
      return true;
    }

    throw new AppError('Admin privileges required', 403);
  }

  async validateEmailUniqueness(email, tenantId, excludeUserId = null) {
    const query = {
      email: email.toLowerCase(),
      tenantId,
      isDeleted: false
    };

    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query);
    if (existingUser) {
      throw new AppError('Email already exists in this tenant', 409);
    }
  }

  validateUserData(userData) {
    const errors = [];

    if (!userData.firstName || userData.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!userData.lastName || userData.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!userData.email || userData.email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('Valid email is required');
      }
    }

    if (userData.password && userData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (userData.role) {
      const validRoles = ['user', 'manager', 'admin', 'tenant_admin'];
      if (!validRoles.includes(userData.role)) {
        errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Validation errors: ${errors.join(', ')}`, 400);
    }

    return true;
  }

  // Helper methods
  async updatePassword(user, newPassword) {
    const saltRounds = process.env.BCRYPT_SALT_ROUNDS || 12;
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(saltRounds));
    user.password = hashedPassword;
    return user.save();
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    delete userObj.passwordResetToken;
    delete userObj.passwordResetExpires;
    delete userObj.emailVerificationToken;
    delete userObj.emailVerificationExpires;
    return userObj;
  }

  validate(data) {
    return this.validateUserData(data);
  }
}

module.exports = Injectable(['UserRepository', 'TenantService'])(UserService);