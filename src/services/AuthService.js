const IService = require('../shared/interfaces/IService');
const { Injectable } = require('../shared/container/ServiceContainer');
const { AppError } = require('../middleware/error.middleware');
const User = require('../domain/entities/User');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getEnvironment } = require('../config/environment');

class AuthService extends IService {
  constructor(userService, tenantService, emailService) {
    super();
    this.userService = userService;
    this.tenantService = tenantService;
    this.emailService = emailService;
    this.env = getEnvironment;
  }

  async register(userData, tenantId) {
    try {
      // Validate tenant exists and is active
      await this.validateTenant(tenantId);

      // Validate registration data
      this.validateRegistrationData(userData);

      // Check if user already exists
      const existingUser = await User.findOne({
        email: userData.email.toLowerCase(),
        tenantId,
        isDeleted: false
      });

      if (existingUser) {
        throw new AppError('User already exists with this email', 409);
      }

      // Create user through UserService
      const user = await this.userService.create({
        ...userData,
        email: userData.email.toLowerCase(),
        role: userData.role || 'user',
        isEmailVerified: false
      }, tenantId);

      // Generate email verification token
      const verificationToken = this.generateEmailVerificationToken();
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      // Send verification email
      if (this.emailService) {
        await this.emailService.sendVerificationEmail(user.email, verificationToken, tenantId);
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      logger.info(`User registered successfully: ${user.email} in tenant ${tenantId}`);

      return {
        user: this.sanitizeUser(user),
        tokens,
        message: 'Registration successful. Please check your email for verification.'
      };
    } catch (error) {
      logger.error('Error during registration:', error);
      throw error;
    }
  }

  async login(credentials, tenantId, req = null) {
    try {
      const { email, password, rememberMe = false } = credentials;

      // Validate tenant
      await this.validateTenant(tenantId);

      // Find user with password
      const user = await User.findOne({
        email: email.toLowerCase(),
        tenantId,
        isDeleted: false
      }).select('+password');

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if account is locked
      if (user.isLocked) {
        const lockTimeRemaining = Math.ceil((user.lockoutUntil - Date.now()) / (1000 * 60));
        throw new AppError(`Account locked. Try again in ${lockTimeRemaining} minutes.`, 423);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.recordFailedLogin();
        throw new AppError('Invalid credentials', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError('Account is deactivated', 401);
      }

      // Check email verification if required
      if (!user.isEmailVerified && this.env.auth.requireEmailVerification) {
        throw new AppError('Please verify your email before logging in', 403);
      }

      // Record successful login
      await user.recordLogin();

      // Generate tokens
      const tokens = this.generateTokens(user, rememberMe);

      // Log security event
      logger.info(`User logged in: ${user.email} from ${req?.ip || 'unknown IP'}`);

      return {
        user: this.sanitizeUser(user),
        tokens,
        message: 'Login successful'
      };
    } catch (error) {
      logger.error('Error during login:', error);
      throw error;
    }
  }

  async logout(userId, refreshToken) {
    try {
      // In a production system, you would:
      // 1. Blacklist the refresh token
      // 2. Store blacklisted tokens in Redis/database
      // 3. Clean up expired blacklisted tokens periodically

      logger.info(`User logged out: ${userId}`);
      return { message: 'Logout successful' };
    } catch (error) {
      logger.error('Error during logout:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 401);
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.env.jwt.refreshSecret);
      
      // Find user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401);
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      logger.debug(`Tokens refreshed for user: ${user.email}`);

      return {
        tokens,
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new AppError('Invalid or expired refresh token', 401);
      }
      logger.error('Error refreshing token:', error);
      throw error;
    }
  }

  async forgotPassword(email, tenantId) {
    try {
      const user = await User.findOne({
        email: email.toLowerCase(),
        tenantId,
        isDeleted: false
      });

      if (!user) {
        // Don't reveal if user exists or not
        return { message: 'If an account with this email exists, a password reset link has been sent.' };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Save reset token to user
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      // Send reset email
      if (this.emailService) {
        await this.emailService.sendPasswordResetEmail(user.email, resetToken, tenantId);
      }

      logger.info(`Password reset requested for: ${email} in tenant ${tenantId}`);

      return { message: 'If an account with this email exists, a password reset link has been sent.' };
    } catch (error) {
      logger.error('Error in forgot password:', error);
      throw error;
    }
  }

  async resetPassword(token, newPassword, tenantId) {
    try {
      // Hash the token to match stored version
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Update password
      user.password = newPassword; // Will be hashed by middleware
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;

      await user.save();

      logger.info(`Password reset completed for user: ${user.email}`);

      return { message: 'Password reset successful' };
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }

  async verifyEmail(token, tenantId) {
    try {
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() },
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('Invalid or expired verification token', 400);
      }

      // Mark email as verified
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;

      await user.save();

      logger.info(`Email verified for user: ${user.email}`);

      return { 
        message: 'Email verified successfully',
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      logger.error('Error verifying email:', error);
      throw error;
    }
  }

  async resendVerificationEmail(email, tenantId) {
    try {
      const user = await User.findOne({
        email: email.toLowerCase(),
        tenantId,
        isDeleted: false
      });

      if (!user) {
        return { message: 'If an account with this email exists, a verification email has been sent.' };
      }

      if (user.isEmailVerified) {
        throw new AppError('Email is already verified', 400);
      }

      // Generate new verification token
      const verificationToken = this.generateEmailVerificationToken();
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await user.save();

      // Send verification email
      if (this.emailService) {
        await this.emailService.sendVerificationEmail(user.email, verificationToken, tenantId);
      }

      logger.info(`Verification email resent to: ${email}`);

      return { message: 'If an account with this email exists, a verification email has been sent.' };
    } catch (error) {
      logger.error('Error resending verification email:', error);
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
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Update password
      user.password = newPassword; // Will be hashed by middleware
      await user.save();

      logger.info(`Password changed for user: ${userId}`);

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.env.jwt.secret);
      
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) {
        throw new AppError('Invalid token', 401);
      }

      return {
        valid: true,
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Invalid or expired token' };
      }
      throw error;
    }
  }

  async getUserSessions(userId, tenantId) {
    try {
      // In a production system, you would store active sessions
      // and return them here. For now, we'll return a placeholder.
      
      const user = await User.findOne({
        _id: userId,
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return {
        sessions: [], // Would contain active session data
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount
      };
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  async revokeAllSessions(userId, tenantId, excludeCurrentToken = null) {
    try {
      // In a production system, you would:
      // 1. Blacklist all existing tokens for this user
      // 2. Optionally exclude the current token from blacklisting
      
      const user = await User.findOne({
        _id: userId,
        tenantId,
        isDeleted: false
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      logger.info(`All sessions revoked for user: ${userId}`);

      return { message: 'All sessions revoked successfully' };
    } catch (error) {
      logger.error('Error revoking sessions:', error);
      throw error;
    }
  }

  // Validation methods
  async validateTenant(tenantId) {
    if (!this.tenantService) return true;

    try {
      const tenant = await this.tenantService.getById(tenantId);
      if (!tenant.isActive || tenant.status !== 'active') {
        throw new AppError('Tenant is not active', 403);
      }
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      // If tenant service fails, continue with auth
      logger.warn(`Could not validate tenant: ${error.message}`);
      return true;
    }
  }

  validateRegistrationData(userData) {
    const errors = [];

    if (!userData.firstName?.trim()) {
      errors.push('First name is required');
    }

    if (!userData.lastName?.trim()) {
      errors.push('Last name is required');
    }

    if (!userData.email?.trim()) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('Valid email is required');
      }
    }

    if (!userData.password) {
      errors.push('Password is required');
    } else {
      this.validatePassword(userData.password);
    }

    if (errors.length > 0) {
      throw new AppError(`Validation errors: ${errors.join(', ')}`, 400);
    }

    return true;
  }

  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    if (errors.length > 0) {
      throw new AppError(`Password validation failed: ${errors.join(', ')}`, 400);
    }

    return true;
  }

  // Helper methods
  generateTokens(user, rememberMe = false) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };

    const accessTokenExpiry = rememberMe ? '30d' : (this.env.jwt.expiresIn || '15m');
    const refreshTokenExpiry = rememberMe ? '90d' : (this.env.jwt.refreshExpiresIn || '7d');

    const accessToken = jwt.sign(payload, this.env.jwt.secret, {
      expiresIn: accessTokenExpiry
    });

    const refreshToken = jwt.sign(
      { id: user._id, tokenType: 'refresh' },
      this.env.jwt.refreshSecret,
      { expiresIn: refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiry,
      tokenType: 'Bearer'
    };
  }

  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
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
    return this.validateRegistrationData(data);
  }
}

module.exports = Injectable(['UserService', 'TenantService', 'EmailService'])(AuthService);