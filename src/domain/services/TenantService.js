const IService = require('../../shared/interfaces/IService');
const { Injectable } = require('../../shared/container/ServiceContainer');
const { AppError } = require('../../middleware/error.middleware');
const Tenant = require('../../tenant/models/Tenant');
const logger = require('../../utils/logger');

@Injectable(['TenantRepository'])
class TenantService extends IService {
  constructor(tenantRepository) {
    super();
    this.tenantRepository = tenantRepository;
  }

  async create(tenantData) {
    try {
      // Validate required fields
      this.validateTenantData(tenantData);

      // Check if tenant ID or subdomain already exists
      await this.checkTenantUniqueness(tenantData.tenantId, tenantData.domain.subdomain);

      // Create tenant
      const tenant = new Tenant({
        ...tenantData,
        status: 'pending',
        subscription: {
          ...tenantData.subscription,
          status: 'trialing',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        },
      });

      const savedTenant = await tenant.save();

      // Initialize tenant database if using database isolation
      if (savedTenant.database.isolationStrategy === 'database') {
        await this.initializeTenantDatabase(savedTenant);
      }

      // Log tenant creation
      logger.info(`Tenant created successfully: ${savedTenant.tenantId}`);

      return savedTenant;
    } catch (error) {
      logger.error('Error creating tenant:', error);
      throw error;
    }
  }

  async getById(tenantId) {
    try {
      const tenant = await Tenant.findByTenantId(tenantId);
      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }
      return tenant;
    } catch (error) {
      logger.error(`Error getting tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async getBySubdomain(subdomain) {
    try {
      const tenant = await Tenant.findBySubdomain(subdomain);
      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }
      return tenant;
    } catch (error) {
      logger.error(`Error getting tenant by subdomain ${subdomain}:`, error);
      throw error;
    }
  }

  async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        plan,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const query = { isDeleted: false };
      
      if (status) query.status = status;
      if (plan) query['subscription.plan'] = plan;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [tenants, total] = await Promise.all([
        Tenant.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Tenant.countDocuments(query),
      ]);

      return {
        tenants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting all tenants:', error);
      throw error;
    }
  }

  async update(tenantId, updateData) {
    try {
      const tenant = await this.getById(tenantId);

      // Validate update data
      if (updateData.tenantId && updateData.tenantId !== tenantId) {
        await this.checkTenantUniqueness(updateData.tenantId);
      }

      if (updateData.domain?.subdomain && updateData.domain.subdomain !== tenant.domain.subdomain) {
        await this.checkSubdomainUniqueness(updateData.domain.subdomain);
      }

      // Update tenant
      Object.assign(tenant, updateData);
      const updatedTenant = await tenant.save();

      logger.info(`Tenant updated successfully: ${tenantId}`);
      return updatedTenant;
    } catch (error) {
      logger.error(`Error updating tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async delete(tenantId) {
    try {
      const tenant = await this.getById(tenantId);

      // Soft delete
      await tenant.softDelete();

      // Archive tenant data if needed
      await this.archiveTenantData(tenant);

      logger.info(`Tenant deleted successfully: ${tenantId}`);
      return { success: true, message: 'Tenant deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async activate(tenantId) {
    try {
      const tenant = await this.getById(tenantId);
      await tenant.activate();
      
      logger.info(`Tenant activated: ${tenantId}`);
      return tenant;
    } catch (error) {
      logger.error(`Error activating tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async suspend(tenantId, reason) {
    try {
      const tenant = await this.getById(tenantId);
      await tenant.suspend(reason);
      
      logger.info(`Tenant suspended: ${tenantId}, reason: ${reason}`);
      return tenant;
    } catch (error) {
      logger.error(`Error suspending tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async upgradeSubscription(tenantId, newPlan) {
    try {
      const tenant = await this.getById(tenantId);
      await tenant.upgradeSubscription(newPlan);
      
      logger.info(`Tenant subscription upgraded: ${tenantId} to ${newPlan}`);
      return tenant;
    } catch (error) {
      logger.error(`Error upgrading tenant subscription ${tenantId}:`, error);
      throw error;
    }
  }

  async updateUsage(tenantId, type, increment = 1) {
    try {
      const tenant = await this.getById(tenantId);
      
      // Check limits before updating
      const limits = tenant.isWithinLimits();
      const currentValue = tenant.usage[`current${type.charAt(0).toUpperCase() + type.slice(1)}`];
      const maxValue = tenant.limits[`max${type.charAt(0).toUpperCase() + type.slice(1)}`];
      
      if (maxValue !== -1 && currentValue + increment > maxValue) {
        throw new AppError(`${type} limit exceeded for tenant`, 403);
      }

      await tenant.updateUsage(type, increment);
      
      return tenant;
    } catch (error) {
      logger.error(`Error updating tenant usage ${tenantId}:`, error);
      throw error;
    }
  }

  async getUsageStats(tenantId) {
    try {
      const tenant = await this.getById(tenantId);
      
      return {
        usage: tenant.usage,
        limits: tenant.limits,
        usagePercentage: tenant.usagePercentage,
        isWithinLimits: tenant.isWithinLimits(),
      };
    } catch (error) {
      logger.error(`Error getting tenant usage stats ${tenantId}:`, error);
      throw error;
    }
  }

  async getExpiredTrials() {
    try {
      return await Tenant.findExpiredTrials();
    } catch (error) {
      logger.error('Error getting expired trials:', error);
      throw error;
    }
  }

  async search(criteria, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const query = { isDeleted: false, ...criteria };
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [tenants, total] = await Promise.all([
        Tenant.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Tenant.countDocuments(query),
      ]);

      return {
        tenants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching tenants:', error);
      throw error;
    }
  }

  validate(data) {
    const errors = [];

    if (!data.tenantId) {
      errors.push('Tenant ID is required');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(data.tenantId)) {
      errors.push('Tenant ID can only contain letters, numbers, hyphens, and underscores');
    }

    if (!data.tenantName) {
      errors.push('Tenant name is required');
    }

    if (!data.domain?.subdomain) {
      errors.push('Subdomain is required');
    } else if (!/^[a-z0-9-]+$/.test(data.domain.subdomain)) {
      errors.push('Subdomain can only contain lowercase letters, numbers, and hyphens');
    }

    if (!data.contact?.primaryContact?.email) {
      errors.push('Primary contact email is required');
    }

    if (errors.length > 0) {
      throw new AppError(`Validation errors: ${errors.join(', ')}`, 400);
    }

    return true;
  }

  // Private methods
  validateTenantData(data) {
    return this.validate(data);
  }

  async checkTenantUniqueness(tenantId, subdomain = null) {
    const existingTenant = await Tenant.findOne({
      $or: [
        { tenantId },
        subdomain ? { 'domain.subdomain': subdomain } : null,
      ].filter(Boolean),
      isDeleted: false,
    });

    if (existingTenant) {
      if (existingTenant.tenantId === tenantId) {
        throw new AppError('Tenant ID already exists', 409);
      }
      if (existingTenant.domain.subdomain === subdomain) {
        throw new AppError('Subdomain already exists', 409);
      }
    }
  }

  async checkSubdomainUniqueness(subdomain) {
    const existing = await Tenant.findOne({
      'domain.subdomain': subdomain,
      isDeleted: false,
    });

    if (existing) {
      throw new AppError('Subdomain already exists', 409);
    }
  }

  async initializeTenantDatabase(tenant) {
    try {
      // This method would initialize the tenant-specific database
      // For now, we'll just log the action
      logger.info(`Initializing database for tenant: ${tenant.tenantId}`);
      
      // In a real implementation, you would:
      // 1. Create the database connection
      // 2. Run migrations
      // 3. Seed initial data
      // 4. Create indexes
      
      return true;
    } catch (error) {
      logger.error(`Error initializing database for tenant ${tenant.tenantId}:`, error);
      throw error;
    }
  }

  async archiveTenantData(tenant) {
    try {
      // This method would archive tenant data before deletion
      logger.info(`Archiving data for tenant: ${tenant.tenantId}`);
      
      // In a real implementation, you would:
      // 1. Export tenant data
      // 2. Store in archive location
      // 3. Clean up tenant database
      
      return true;
    } catch (error) {
      logger.error(`Error archiving data for tenant ${tenant.tenantId}:`, error);
      throw error;
    }
  }
}

module.exports = TenantService;