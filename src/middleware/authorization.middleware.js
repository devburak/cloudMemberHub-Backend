const { AppError } = require('./error.middleware');
const logger = require('../utils/logger');

/**
 * Middleware to check if user has required role(s)
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} Express middleware function
 */
const requireRole = (roles) => {
  // Normalize roles to array
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some(role => req.user.hasRole(role));
    
    if (!hasRole) {
      logger.warn(`Access denied for user ${req.user.email}: required role(s) ${requiredRoles.join(', ')}, current role: ${req.user.role}`);
      throw new AppError('Insufficient permissions', 403);
    }

    logger.debug(`Role authorization passed for user ${req.user.email} with role ${req.user.role}`);
    next();
  };
};

/**
 * Middleware to check if user has required permission(s)
 * @param {string|Array} permissions - Required permission(s)
 * @returns {Function} Express middleware function
 */
const requirePermission = (permissions) => {
  // Normalize permissions to array
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission => 
      req.user.hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      logger.warn(`Permission denied for user ${req.user.email}: required ${requiredPermissions.join(', ')}`);
      throw new AppError('Insufficient permissions', 403);
    }

    logger.debug(`Permission authorization passed for user ${req.user.email}`);
    next();
  };
};

/**
 * Middleware to check if user has any of the required permissions
 * @param {Array} permissions - Array of permissions (user needs at least one)
 * @returns {Function} Express middleware function
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some(permission => 
      req.user.hasPermission(permission)
    );
    
    if (!hasAnyPermission) {
      logger.warn(`Permission denied for user ${req.user.email}: needs any of ${permissions.join(', ')}`);
      throw new AppError('Insufficient permissions', 403);
    }

    logger.debug(`Any-permission authorization passed for user ${req.user.email}`);
    next();
  };
};

/**
 * Middleware to check tenant-specific role
 * @param {string|Array} roles - Required tenant role(s)
 * @returns {Function} Express middleware function
 */
const requireTenantRole = (roles) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!req.tenantId) {
      throw new AppError('Tenant context required', 400);
    }

    // Get user's role for current tenant
    const userTenantRole = req.user.getTenantRole(req.tenantId);
    
    if (!userTenantRole) {
      logger.warn(`No tenant role found for user ${req.user.email} in tenant ${req.tenantId}`);
      throw new AppError('No access to this tenant', 403);
    }

    // Check if user has required tenant role
    const hasRole = requiredRoles.includes(userTenantRole);
    
    if (!hasRole) {
      logger.warn(`Tenant role access denied for user ${req.user.email}: required ${requiredRoles.join(', ')}, current: ${userTenantRole}`);
      throw new AppError('Insufficient tenant permissions', 403);
    }

    logger.debug(`Tenant role authorization passed for user ${req.user.email} with role ${userTenantRole}`);
    next();
  };
};

/**
 * Middleware to check tenant-specific permission
 * @param {string|Array} permissions - Required tenant permission(s)
 * @returns {Function} Express middleware function
 */
const requireTenantPermission = (permissions) => {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!req.tenantId) {
      throw new AppError('Tenant context required', 400);
    }

    // Check if user has all required tenant permissions
    const hasAllPermissions = requiredPermissions.every(permission => 
      req.user.hasTenantPermission(req.tenantId, permission)
    );
    
    if (!hasAllPermissions) {
      logger.warn(`Tenant permission denied for user ${req.user.email} in tenant ${req.tenantId}: required ${requiredPermissions.join(', ')}`);
      throw new AppError('Insufficient tenant permissions', 403);
    }

    logger.debug(`Tenant permission authorization passed for user ${req.user.email} in tenant ${req.tenantId}`);
    next();
  };
};

/**
 * Middleware to check if user can access their own resource or has admin permission
 * @param {string} userIdParam - Parameter name containing user ID (default: 'userId')
 * @param {string} adminPermission - Admin permission to override ownership check
 * @returns {Function} Express middleware function
 */
const requireOwnershipOrPermission = (userIdParam = 'userId', adminPermission = 'users.read') => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (!targetUserId) {
      throw new AppError(`${userIdParam} parameter is required`, 400);
    }

    // Allow if user is accessing their own resource
    if (req.user._id.toString() === targetUserId) {
      logger.debug(`Ownership authorization passed for user ${req.user.email}`);
      return next();
    }

    // Allow if user has admin permission
    if (req.user.hasPermission(adminPermission)) {
      logger.debug(`Admin permission authorization passed for user ${req.user.email}`);
      return next();
    }

    logger.warn(`Ownership/permission access denied for user ${req.user.email} accessing ${targetUserId}`);
    throw new AppError('Access denied: insufficient permissions', 403);
  };
};

/**
 * Middleware to check if user is super admin
 * @returns {Function} Express middleware function
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (!req.user.hasRole('super_admin')) {
    logger.warn(`Super admin access denied for user ${req.user.email} with role ${req.user.role}`);
    throw new AppError('Super admin access required', 403);
  }

  logger.debug(`Super admin authorization passed for user ${req.user.email}`);
  next();
};

/**
 * Middleware to check if user is tenant admin (or higher)
 * @returns {Function} Express middleware function
 */
const requireTenantAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const allowedRoles = ['super_admin', 'tenant_admin'];
  const hasRole = allowedRoles.some(role => req.user.hasRole(role));
  
  if (!hasRole) {
    logger.warn(`Tenant admin access denied for user ${req.user.email} with role ${req.user.role}`);
    throw new AppError('Tenant admin access required', 403);
  }

  logger.debug(`Tenant admin authorization passed for user ${req.user.email}`);
  next();
};

/**
 * Middleware to check if user is active and not locked
 * @returns {Function} Express middleware function
 */
const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (!req.user.isActive) {
    logger.warn(`Inactive user access attempt: ${req.user.email}`);
    throw new AppError('Account is deactivated', 403);
  }

  if (req.user.isAccountLocked()) {
    logger.warn(`Locked account access attempt: ${req.user.email}`);
    throw new AppError('Account is locked', 423);
  }

  next();
};

/**
 * Middleware to combine multiple authorization checks with AND logic
 * @param {Array} middlewares - Array of authorization middleware functions
 * @returns {Function} Express middleware function
 */
const requireAll = (middlewares) => {
  return async (req, res, next) => {
    try {
      for (const middleware of middlewares) {
        await new Promise((resolve, reject) => {
          middleware(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Common role combinations for convenience
 */
const roles = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin', 
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};

const permissions = {
  // User permissions
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  USERS_DELETE: 'users.delete',
  
  // Member permissions
  MEMBERS_READ: 'members.read',
  MEMBERS_WRITE: 'members.write',
  MEMBERS_DELETE: 'members.delete',
  
  // Report permissions
  REPORTS_READ: 'reports.read',
  REPORTS_WRITE: 'reports.write',
  
  // Settings permissions
  SETTINGS_READ: 'settings.read',
  SETTINGS_WRITE: 'settings.write',
  
  // Tenant permissions
  TENANT_MANAGE: 'tenant.manage',
};

module.exports = {
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireTenantRole,
  requireTenantPermission,
  requireOwnershipOrPermission,
  requireSuperAdmin,
  requireTenantAdmin,
  requireActiveUser,
  requireAll,
  roles,
  permissions,
};