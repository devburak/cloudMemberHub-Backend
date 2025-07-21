const tenantContext = require('../context/TenantContext');
const tenantResolver = require('../resolver/TenantResolver');
const { AppError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger');

const createTenantMiddleware = (options = {}) => {
  const {
    strategy = 'header', // 'header', 'subdomain', 'path'
    required = true,
    skipRoutes = ['/health', '/api-docs', '/', '/api'],
  } = options;

  return async (req, res, next) => {
    try {
      // Skip tenant resolution for certain routes
      if (skipRoutes.some(route => req.path === route || req.path.startsWith(route))) {
        return next();
      }

      // Resolve tenant information
      let tenantInfo = null;
      
      try {
        tenantInfo = await tenantResolver.resolveTenant(req, strategy);
      } catch (error) {
        if (required) {
          throw error;
        } else {
          logger.warn('Tenant resolution failed, but not required:', error.message);
        }
      }

      if (required && !tenantInfo) {
        throw new AppError('Tenant information is required', 400);
      }

      // Set tenant context and continue with request
      return tenantContext.run(tenantInfo, () => {
        // Add tenant info to request for easy access
        req.tenant = tenantInfo;
        req.tenantId = tenantInfo?.tenantId;
        
        // Add tenant info to response headers for debugging
        if (tenantInfo && process.env.NODE_ENV === 'development') {
          res.set('X-Current-Tenant', tenantInfo.tenantId);
          res.set('X-Tenant-Name', tenantInfo.tenantName);
        }

        next();
      });

    } catch (error) {
      logger.error('Tenant middleware error:', error);
      next(error);
    }
  };
};

// Multi-tenant database connection middleware
const createTenantDatabaseMiddleware = () => {
  return async (req, res, next) => {
    try {
      const tenantInfo = tenantContext.getCurrentTenant();
      
      if (tenantInfo && tenantInfo.isolationStrategy === 'database') {
        // Bu middleware'de tenant-specific database connection kurulacak
        // Şimdilik sadece context'e ekliyoruz
        req.tenantDatabase = tenantInfo.databaseConfig;
      }

      next();
    } catch (error) {
      logger.error('Tenant database middleware error:', error);
      next(error);
    }
  };
};

// Tenant validation middleware
const validateTenantAccess = (requiredFeatures = []) => {
  return (req, res, next) => {
    try {
      const tenantInfo = tenantContext.getCurrentTenant();
      
      if (!tenantInfo) {
        throw new AppError('Tenant context not found', 500);
      }

      // Check if tenant has required features
      if (requiredFeatures.length > 0) {
        const tenantFeatures = tenantInfo.tenantConfig?.features || [];
        const hasAllFeatures = requiredFeatures.every(feature => 
          tenantFeatures.includes(feature)
        );

        if (!hasAllFeatures) {
          const missingFeatures = requiredFeatures.filter(feature => 
            !tenantFeatures.includes(feature)
          );
          throw new AppError(
            `Tenant does not have access to required features: ${missingFeatures.join(', ')}`, 
            403
          );
        }
      }

      next();
    } catch (error) {
      logger.error('Tenant validation error:', error);
      next(error);
    }
  };
};

// Tenant rate limiting
const createTenantRateLimit = () => {
  const tenantLimits = new Map();

  return (req, res, next) => {
    try {
      const tenantInfo = tenantContext.getCurrentTenant();
      
      if (!tenantInfo) {
        return next();
      }

      const tenantId = tenantInfo.tenantId;
      const now = Date.now();
      const windowSize = 60 * 1000; // 1 minute
      const defaultLimit = 100;

      // Get tenant specific limits
      const tenantLimit = tenantInfo.tenantConfig?.rateLimits?.requests || defaultLimit;

      if (!tenantLimits.has(tenantId)) {
        tenantLimits.set(tenantId, {
          requests: 0,
          resetTime: now + windowSize,
        });
      }

      const limitInfo = tenantLimits.get(tenantId);

      // Reset if window expired
      if (now > limitInfo.resetTime) {
        limitInfo.requests = 0;
        limitInfo.resetTime = now + windowSize;
      }

      // Check limit
      if (limitInfo.requests >= tenantLimit) {
        return res.status(429).json({
          success: false,
          message: 'Tenant rate limit exceeded',
          retryAfter: Math.ceil((limitInfo.resetTime - now) / 1000),
        });
      }

      limitInfo.requests++;
      next();
    } catch (error) {
      logger.error('Tenant rate limit error:', error);
      next(error);
    }
  };
};

module.exports = {
  createTenantMiddleware,
  createTenantDatabaseMiddleware,
  validateTenantAccess,
  createTenantRateLimit,
};