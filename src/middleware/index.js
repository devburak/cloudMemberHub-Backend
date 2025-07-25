// Authentication middleware exports
const {
  authenticateToken,
  authenticateRefreshToken,
  optionalAuth,
  requireAuth,
  requireNoAuth,
  validateServiceAuth,
} = require('./auth.middleware');

// Authorization middleware exports
const {
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
} = require('./authorization.middleware');

// Error middleware exports
const {
  AppError,
  globalErrorHandler,
  asyncHandler,
} = require('./error.middleware');

// API Key middleware
const { validateApiKey } = require('./apiKey.middleware');

/**
 * Common middleware combinations for convenience
 */
const auth = {
  // Basic authentication
  required: authenticateToken,
  optional: optionalAuth,
  refresh: authenticateRefreshToken,
  service: validateServiceAuth,
  none: requireNoAuth,
  
  // Role-based access
  superAdmin: [authenticateToken, requireSuperAdmin],
  tenantAdmin: [authenticateToken, requireTenantAdmin],
  admin: [authenticateToken, requireRole(['super_admin', 'tenant_admin', 'admin'])],
  manager: [authenticateToken, requireRole(['super_admin', 'tenant_admin', 'admin', 'manager'])],
  
  // Permission-based access
  canReadUsers: [authenticateToken, requirePermission(permissions.USERS_READ)],
  canWriteUsers: [authenticateToken, requirePermission(permissions.USERS_WRITE)],
  canDeleteUsers: [authenticateToken, requirePermission(permissions.USERS_DELETE)],
  
  canReadMembers: [authenticateToken, requirePermission(permissions.MEMBERS_READ)],
  canWriteMembers: [authenticateToken, requirePermission(permissions.MEMBERS_WRITE)],
  canDeleteMembers: [authenticateToken, requirePermission(permissions.MEMBERS_DELETE)],
  
  canReadReports: [authenticateToken, requirePermission(permissions.REPORTS_READ)],
  canWriteReports: [authenticateToken, requirePermission(permissions.REPORTS_WRITE)],
  
  canReadSettings: [authenticateToken, requirePermission(permissions.SETTINGS_READ)],
  canWriteSettings: [authenticateToken, requirePermission(permissions.SETTINGS_WRITE)],
  
  canManageTenant: [authenticateToken, requirePermission(permissions.TENANT_MANAGE)],
};

module.exports = {
  // Authentication
  authenticateToken,
  authenticateRefreshToken,
  optionalAuth,
  requireAuth,
  requireNoAuth,
  validateServiceAuth,
  
  // Authorization
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
  
  // Error handling
  AppError,
  globalErrorHandler,
  asyncHandler,
  
  // API Key
  validateApiKey,
  
  // Convenience combinations
  auth,
};