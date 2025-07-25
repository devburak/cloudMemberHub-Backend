const jwt = require('jsonwebtoken');
const { AppError, asyncHandler } = require('./error.middleware');
const User = require('../domain/entities/User');
const { getEnvironment } = require('../config/environment');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 * Extracts token from Authorization header or cookies
 * Verifies token and attaches user to request object
 */
const authenticateToken = asyncHandler(async (req, res, next) => {
  let token;
  
  // Extract token from Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Extract token from cookies (for web apps)
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // Extract token from custom header (for API clients)
  else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  if (!token) {
    throw new AppError('Access token is required', 401);
  }

  try {
    // Verify token
    const env = getEnvironment();
    const decoded = jwt.verify(token, env.jwt.secret);
    
    // Find user by ID
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      throw new AppError('User not found or token invalid', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      throw new AppError('Account is locked due to multiple failed login attempts', 423);
    }

    // Check if email is verified (if required)
    if (!user.isEmailVerified && env.auth.requireEmailVerification) {
      throw new AppError('Email verification required', 403);
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.tenantId = user.tenantId;
    
    logger.debug(`User authenticated: ${user.email} (${user._id})`);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401);
    }
    throw error;
  }
});

/**
 * Middleware to authenticate refresh tokens
 * Used specifically for token refresh endpoints
 */
const authenticateRefreshToken = asyncHandler(async (req, res, next) => {
  let refreshToken;
  
  // Extract refresh token from cookies or body
  if (req.cookies && req.cookies.refreshToken) {
    refreshToken = req.cookies.refreshToken;
  } else if (req.body.refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  try {
    const env = getEnvironment();
    const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
    
    // Find user and check if refresh token is still valid
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      throw new AppError('User not found or refresh token invalid', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // Check if this refresh token is in the user's valid tokens list (if implemented)
    // This would require storing refresh tokens in the database
    
    req.user = user;
    req.userId = user._id;
    req.tenantId = user.tenantId;
    req.refreshToken = refreshToken;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid refresh token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired', 401);
    }
    throw error;
  }
});

/**
 * Optional authentication middleware
 * Does not throw error if no token is provided
 * Used for routes that work for both authenticated and unauthenticated users
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  
  // Try to extract token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  // If no token, continue without authentication
  if (!token) {
    req.user = null;
    req.userId = null;
    req.tenantId = null;
    return next();
  }

  try {
    const env = getEnvironment();
    const decoded = jwt.verify(token, env.jwt.secret);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive && !user.isAccountLocked()) {
      req.user = user;
      req.userId = user._id;
      req.tenantId = user.tenantId;
    } else {
      req.user = null;
      req.userId = null;
      req.tenantId = null;
    }
  } catch (error) {
    // Ignore token errors in optional auth
    req.user = null;
    req.userId = null;
    req.tenantId = null;
  }

  next();
});

/**
 * Middleware to check if user is authenticated (used after authenticateToken)
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  next();
};

/**
 * Middleware to check if user is not authenticated
 * Useful for routes like login/register that should only be accessible to unauthenticated users
 */
const requireNoAuth = (req, res, next) => {
  if (req.user) {
    throw new AppError('Already authenticated', 400);
  }
  next();
};

/**
 * Middleware to validate API key for service-to-service communication
 * Can be used alongside JWT auth or independently
 */
const validateServiceAuth = asyncHandler(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    throw new AppError('API key is required for service authentication', 401);
  }

  const env = getEnvironment();
  
  // Check against configured service API keys
  if (!env.api.serviceKeys.includes(apiKey)) {
    throw new AppError('Invalid API key', 401);
  }

  // Mark request as service-authenticated
  req.isServiceAuth = true;
  req.authType = 'service';
  
  logger.debug('Service authenticated via API key');
  next();
});

module.exports = {
  authenticateToken,
  authenticateRefreshToken,
  optionalAuth,
  requireAuth,
  requireNoAuth,
  validateServiceAuth,
};