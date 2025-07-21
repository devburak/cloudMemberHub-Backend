const { AppError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger');

class TenantResolver {
  constructor() {
    this.tenantCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async resolveTenantFromHeader(req) {
    const organizationId = req.headers['x-organization-id'] || req.headers['organization-id'] || req.headers['x-tenant-id'] || req.headers['tenant-id'];
    
    if (!organizationId) {
      throw new AppError('Organization ID is required', 400);
    }

    return this.getOrganizationInfo(organizationId);
  }

  async resolveTenantFromSubdomain(req) {
    const host = req.get('host');
    const subdomain = host?.split('.')[0];
    
    if (!subdomain || subdomain === 'www' || subdomain === 'api') {
      throw new AppError('Invalid organization subdomain', 400);
    }

    return this.getOrganizationInfoBySubdomain(subdomain);
  }

  async resolveTenantFromPath(req) {
    const pathParts = req.path.split('/');
    const organizationId = pathParts[2]; // /api/org123/...
    
    if (!organizationId) {
      throw new AppError('Organization ID not found in path', 400);
    }

    return this.getOrganizationInfo(organizationId);
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

  async getOrganizationInfo(organizationId) {
    // Cache kontrolü
    const cached = this.tenantCache.get(organizationId);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    // Gerçek uygulamada bu bilgi database'den gelecek
    const organizationInfo = await this.fetchOrganizationFromDatabase(organizationId);
    
    if (organizationInfo) {
      this.tenantCache.set(organizationId, {
        data: organizationInfo,
        timestamp: Date.now()
      });
    }

    return organizationInfo;
  }

  async getOrganizationInfoBySubdomain(subdomain) {
    // Gerçek uygulamada bu bilgi database'den gelecek
    return this.fetchOrganizationFromDatabaseBySubdomain(subdomain);
  }

  // Legacy support
  async getTenantInfo(tenantId) {
    return this.getOrganizationInfo(tenantId);
  }

  async getTenantInfoBySubdomain(subdomain) {
    return this.getOrganizationInfoBySubdomain(subdomain);
  }

  async fetchOrganizationFromDatabase(organizationId) {
    // Bu method gerçek uygulamada OrganizationService'den gelecek
    // Şimdilik mock data döndürüyoruz
    const mockOrganizations = {
      'memberhub-dev': {
        tenantId: 'memberhub-dev', // Legacy support
        organizationId: 'memberhub-dev',
        tenantName: 'MemberHub Development', // Legacy support
        organizationName: 'MemberHub Development',
        tenantSchema: 'memberhub_dev',
        subdomain: 'dev',
        customDomain: 'memberhub.com',
        type: 'association',
        isActive: true,
        isolationStrategy: 'database',
        databaseConfig: {
          uri: process.env.MONGODB_URI,
          dbName: `memberhub_memberhub_dev`,
        },
        tenantConfig: {
          features: ['users', 'members', 'reports', 'analytics', 'integrations', 'api_access', 'financial', 'events'],
          limits: {
            maxUsers: -1,
            maxMembers: -1,
          },
          settings: {
            timezone: 'Europe/Istanbul',
            currency: 'TRY',
            language: 'tr',
          },
          rateLimits: {
            requests: 1000,
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'dernek-ornek': {
        tenantId: 'dernek-ornek',
        organizationId: 'dernek-ornek',
        tenantName: 'Örnek Derneği',
        organizationName: 'Örnek Derneği',
        tenantSchema: 'dernek_ornek',
        subdomain: 'ornekdernek',
        type: 'association',
        isActive: true,
        isolationStrategy: 'database',
        databaseConfig: {
          uri: process.env.MONGODB_URI,
          dbName: `memberhub_dernek_ornek`,
        },
        tenantConfig: {
          features: ['users', 'members', 'reports', 'communication', 'events'],
          limits: {
            maxUsers: 50,
            maxMembers: 500,
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
      'meslek-odasi': {
        tenantId: 'meslek-odasi',
        organizationId: 'meslek-odasi',
        tenantName: 'Örnek Meslek Odası',
        organizationName: 'Örnek Meslek Odası',
        tenantSchema: 'meslek_odasi',
        subdomain: 'meslekodasi',
        type: 'professional_chamber',
        isActive: true,
        isolationStrategy: 'database',
        databaseConfig: {
          uri: process.env.MONGODB_URI,
          dbName: `memberhub_meslek_odasi`,
        },
        tenantConfig: {
          features: ['users', 'members', 'reports', 'financial', 'governance', 'education'],
          limits: {
            maxUsers: 100,
            maxMembers: 2000,
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
    };

    return mockOrganizations[organizationId] || null;
  }

  async fetchOrganizationFromDatabaseBySubdomain(subdomain) {
    // Bu method gerçek uygulamada OrganizationService'den gelecek
    const organizations = Object.values(await this.getAllMockOrganizations());
    return organizations.find(org => org.subdomain === subdomain) || null;
  }

  async getAllMockOrganizations() {
    return {
      'memberhub-dev': await this.fetchOrganizationFromDatabase('memberhub-dev'),
      'dernek-ornek': await this.fetchOrganizationFromDatabase('dernek-ornek'),
      'meslek-odasi': await this.fetchOrganizationFromDatabase('meslek-odasi'),
    };
  }

  // Legacy support
  async fetchTenantFromDatabase(tenantId) {
    // Bu method gerçek uygulamada TenantService'den gelecek
    // Şimdilik mock data döndürüyoruz
    const mockTenants = {
      'main': {
        tenantId: 'main',
        tenantName: 'MemberHub Development',
        tenantSchema: 'memberhub',
        subdomain: 'dev',
        customDomain: 'memberhub.com',
        isActive: true,
        isolationStrategy: 'database', // 'database', 'schema', 'row'
        databaseConfig: {
          uri: process.env.MONGODB_URI,
          dbName: `cloudmemberhub_main`,
        },
        tenantConfig: {
          features: ['users', 'members', 'reports', 'analytics', 'integrations', 'api_access'],
          limits: {
            maxUsers: -1, // Unlimited
            maxMembers: -1, // Unlimited
          },
          settings: {
            timezone: 'Europe/Istanbul',
            currency: 'TRY',
            language: 'tr',
          },
          rateLimits: {
            requests: 1000,
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
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