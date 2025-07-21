const { AppError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger');

class TenantResolver {
  constructor() {
    this.tenantCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async resolveTenantFromHeader(req) {
    const tenantId = req.headers['x-tenant-id'] || req.headers['tenant-id'];
    
    if (!tenantId) {
      throw new AppError('Tenant ID is required', 400);
    }

    return this.getTenantInfo(tenantId);
  }

  async resolveTenantFromSubdomain(req) {
    const host = req.get('host');
    const subdomain = host?.split('.')[0];
    
    if (!subdomain || subdomain === 'www' || subdomain === 'api') {
      throw new AppError('Invalid tenant subdomain', 400);
    }

    return this.getTenantInfoBySubdomain(subdomain);
  }

  async resolveTenantFromPath(req) {
    const pathParts = req.path.split('/');
    const tenantId = pathParts[2]; // /api/tenant123/...
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found in path', 400);
    }

    return this.getTenantInfo(tenantId);
  }

  async resolveTenant(req, strategy = 'header') {
    try {
      let tenantInfo;

      switch (strategy) {
        case 'subdomain':
          tenantInfo = await this.resolveTenantFromSubdomain(req);
          break;
        case 'path':
          tenantInfo = await this.resolveTenantFromPath(req);
          break;
        case 'header':
        default:
          tenantInfo = await this.resolveTenantFromHeader(req);
          break;
      }

      if (!tenantInfo) {
        throw new AppError('Tenant not found', 404);
      }

      if (!tenantInfo.isActive) {
        throw new AppError('Tenant is inactive', 403);
      }

      return tenantInfo;
    } catch (error) {
      logger.error('Tenant resolution error:', error);
      throw error;
    }
  }

  async getTenantInfo(tenantId) {
    // Cache kontrolü
    const cached = this.tenantCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    // Gerçek uygulamada bu bilgi database'den gelecek
    const tenantInfo = await this.fetchTenantFromDatabase(tenantId);
    
    if (tenantInfo) {
      this.tenantCache.set(tenantId, {
        data: tenantInfo,
        timestamp: Date.now()
      });
    }

    return tenantInfo;
  }

  async getTenantInfoBySubdomain(subdomain) {
    // Gerçek uygulamada bu bilgi database'den gelecek
    return this.fetchTenantFromDatabaseBySubdomain(subdomain);
  }

  async fetchTenantFromDatabase(tenantId) {
    // Bu method gerçek uygulamada TenantService'den gelecek
    // Şimdilik mock data döndürüyoruz
    const mockTenants = {
      'tenant1': {
        tenantId: 'tenant1',
        tenantName: 'Company A',
        tenantSchema: 'company_a',
        subdomain: 'company-a',
        isActive: true,
        isolationStrategy: 'database', // 'database', 'schema', 'row'
        databaseConfig: {
          uri: process.env.MONGODB_URI,
          dbName: `cloudmemberhub_${tenantId}`,
        },
        tenantConfig: {
          features: ['users', 'members', 'reports'],
          limits: {
            maxUsers: 100,
            maxMembers: 1000,
          },
          settings: {
            timezone: 'Europe/Istanbul',
            currency: 'TRY',
            language: 'tr',
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'tenant2': {
        tenantId: 'tenant2',
        tenantName: 'Company B',
        tenantSchema: 'company_b',
        subdomain: 'company-b',
        isActive: true,
        isolationStrategy: 'database',
        databaseConfig: {
          uri: process.env.MONGODB_URI,
          dbName: `cloudmemberhub_${tenantId}`,
        },
        tenantConfig: {
          features: ['users', 'members'],
          limits: {
            maxUsers: 50,
            maxMembers: 500,
          },
          settings: {
            timezone: 'Europe/London',
            currency: 'EUR',
            language: 'en',
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    };

    return mockTenants[tenantId] || null;
  }

  async fetchTenantFromDatabaseBySubdomain(subdomain) {
    // Bu method gerçek uygulamada TenantService'den gelecek
    const tenants = Object.values(await this.getAllMockTenants());
    return tenants.find(tenant => tenant.subdomain === subdomain) || null;
  }

  async getAllMockTenants() {
    // Mock data - gerçek uygulamada database'den gelecek
    return {
      'tenant1': await this.fetchTenantFromDatabase('tenant1'),
      'tenant2': await this.fetchTenantFromDatabase('tenant2'),
    };
  }

  clearCache(tenantId = null) {
    if (tenantId) {
      this.tenantCache.delete(tenantId);
    } else {
      this.tenantCache.clear();
    }
  }
}

const tenantResolver = new TenantResolver();

module.exports = tenantResolver;