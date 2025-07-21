const IService = require('../../shared/interfaces/IService');
const { Injectable } = require('../../shared/container/ServiceContainer');
const { AppError } = require('../../middleware/error.middleware');
const Organization = require('../entities/Organization');
const logger = require('../../utils/logger');

@Injectable(['OrganizationRepository'])
class OrganizationService extends IService {
  constructor(organizationRepository) {
    super();
    this.organizationRepository = organizationRepository;
  }

  async create(organizationData) {
    try {
      // Validate required fields
      this.validateOrganizationData(organizationData);

      // Check uniqueness
      await this.checkOrganizationUniqueness(
        organizationData.organizationId,
        organizationData.legalInfo?.registrationNumber,
        organizationData.domain?.subdomain
      );

      // Set default modules based on organization type
      organizationData.modules = this.getDefaultModules(organizationData.type);
      
      // Set default limits based on subscription plan
      organizationData.limits = this.getDefaultLimits(organizationData.subscription?.plan || 'basic');

      // Generate database name
      organizationData.dataIsolation = {
        strategy: 'database',
        databaseName: `memberhub_${organizationData.organizationId}`,
      };

      // Create organization
      const organization = new Organization({
        ...organizationData,
        status: 'pending_approval',
      });

      const savedOrganization = await organization.save();

      // Initialize organization database
      await this.initializeOrganizationDatabase(savedOrganization);

      logger.info(`Organization created: ${savedOrganization.organizationId} (${savedOrganization.name})`);
      return savedOrganization;
    } catch (error) {
      logger.error('Error creating organization:', error);
      throw error;
    }
  }

  async getById(organizationId) {
    try {
      const organization = await Organization.findByOrganizationId(organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404);
      }
      return organization;
    } catch (error) {
      logger.error(`Error getting organization ${organizationId}:`, error);
      throw error;
    }
  }

  async getBySubdomain(subdomain) {
    try {
      const organization = await Organization.findBySubdomain(subdomain);
      if (!organization) {
        throw new AppError('Organization not found', 404);
      }
      return organization;
    } catch (error) {
      logger.error(`Error getting organization by subdomain ${subdomain}:`, error);
      throw error;
    }
  }

  async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        province,
        plan,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const query = { isDeleted: false };
      
      if (type) query.type = type;
      if (status) query.status = status;
      if (province) query['address.headquarters.province'] = province;
      if (plan) query['subscription.plan'] = plan;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [organizations, total] = await Promise.all([
        Organization.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('organizationId name type status subscription.plan address.headquarters.city address.headquarters.province createdAt')
          .lean(),
        Organization.countDocuments(query),
      ]);

      return {
        organizations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting all organizations:', error);
      throw error;
    }
  }

  async update(organizationId, updateData) {
    try {
      const organization = await this.getById(organizationId);

      // Validate updates
      if (updateData.organizationId && updateData.organizationId !== organizationId) {
        await this.checkOrganizationUniqueness(updateData.organizationId);
      }

      if (updateData.domain?.subdomain && updateData.domain.subdomain !== organization.domain.subdomain) {
        await this.checkSubdomainUniqueness(updateData.domain.subdomain);
      }

      // Update organization
      Object.assign(organization, updateData);
      const updatedOrganization = await organization.save();

      logger.info(`Organization updated: ${organizationId}`);
      return updatedOrganization;
    } catch (error) {
      logger.error(`Error updating organization ${organizationId}:`, error);
      throw error;
    }
  }

  async approve(organizationId, approvedBy) {
    try {
      const organization = await this.getById(organizationId);
      
      if (organization.status !== 'pending_approval') {
        throw new AppError('Organization is not pending approval', 400);
      }

      organization.status = 'active';
      organization.subscription.status = 'trial'; // Start with trial
      organization.metadata.set('approvedBy', approvedBy);
      organization.metadata.set('approvedAt', new Date());

      const updatedOrganization = await organization.save();
      
      logger.info(`Organization approved: ${organizationId} by ${approvedBy}`);
      return updatedOrganization;
    } catch (error) {
      logger.error(`Error approving organization ${organizationId}:`, error);
      throw error;
    }
  }

  async suspend(organizationId, reason, suspendedBy) {
    try {
      const organization = await this.getById(organizationId);
      
      organization.status = 'suspended';
      organization.metadata.set('suspensionReason', reason);
      organization.metadata.set('suspendedBy', suspendedBy);
      organization.metadata.set('suspendedAt', new Date());

      const updatedOrganization = await organization.save();
      
      logger.info(`Organization suspended: ${organizationId}, reason: ${reason}`);
      return updatedOrganization;
    } catch (error) {
      logger.error(`Error suspending organization ${organizationId}:`, error);
      throw error;
    }
  }

  async upgradeSubscription(organizationId, newPlan, upgradeData = {}) {
    try {
      const organization = await this.getById(organizationId);
      
      const oldPlan = organization.subscription.plan;
      organization.subscription.plan = newPlan;
      organization.subscription.status = 'active';
      
      if (upgradeData.currentPeriodStart) {
        organization.subscription.currentPeriodStart = upgradeData.currentPeriodStart;
      }
      
      if (upgradeData.currentPeriodEnd) {
        organization.subscription.currentPeriodEnd = upgradeData.currentPeriodEnd;
      }

      // Update limits based on new plan
      organization.limits = this.getDefaultLimits(newPlan);
      
      // Update modules based on new plan
      const newModules = this.getDefaultModules(organization.type, newPlan);
      Object.assign(organization.modules, newModules);

      const updatedOrganization = await organization.save();
      
      logger.info(`Organization subscription upgraded: ${organizationId} from ${oldPlan} to ${newPlan}`);
      return updatedOrganization;
    } catch (error) {
      logger.error(`Error upgrading organization subscription ${organizationId}:`, error);
      throw error;
    }
  }

  async enableModule(organizationId, moduleName, features = []) {
    try {
      const organization = await this.getById(organizationId);
      
      if (!organization.modules[moduleName]) {
        throw new AppError(`Module ${moduleName} not found`, 400);
      }

      organization.modules[moduleName].enabled = true;
      
      // Enable specific features if provided
      if (features.length > 0) {
        features.forEach(feature => {
          if (organization.modules[moduleName][feature] !== undefined) {
            organization.modules[moduleName][feature] = true;
          }
        });
      }

      const updatedOrganization = await organization.save();
      
      logger.info(`Module enabled for organization ${organizationId}: ${moduleName}`);
      return updatedOrganization;
    } catch (error) {
      logger.error(`Error enabling module for organization ${organizationId}:`, error);
      throw error;
    }
  }

  async getStatistics(organizationId = null) {
    try {
      let matchStage = { isDeleted: false };
      if (organizationId) {
        matchStage.organizationId = organizationId;
      }

      const stats = await Organization.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: organizationId ? '$organizationId' : null,
            totalOrganizations: { $sum: 1 },
            activeOrganizations: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            trialOrganizations: {
              $sum: { $cond: [{ $eq: ['$subscription.status', 'trial'] }, 1, 0] }
            },
            totalMembers: { $sum: '$usage.currentMembers' },
            totalAdmins: { $sum: '$usage.currentAdmins' },
            totalStorageGB: { $sum: '$usage.storageUsedGB' },
            organizationsByType: {
              $push: '$type'
            },
            organizationsByPlan: {
              $push: '$subscription.plan'
            }
          }
        }
      ]);

      return stats[0] || {};
    } catch (error) {
      logger.error('Error getting organization statistics:', error);
      throw error;
    }
  }

  async searchByType(type) {
    try {
      return await Organization.findByType(type);
    } catch (error) {
      logger.error(`Error searching organizations by type ${type}:`, error);
      throw error;
    }
  }

  validate(data) {
    const errors = [];

    if (!data.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!data.name) {
      errors.push('Organization name is required');
    }

    if (!data.type) {
      errors.push('Organization type is required');
    }

    if (!data.legalInfo?.registrationNumber) {
      errors.push('Registration number is required');
    }

    if (!data.legalInfo?.establishedDate) {
      errors.push('Established date is required');
    }

    if (!data.domain?.subdomain) {
      errors.push('Subdomain is required');
    }

    if (!data.address?.headquarters?.city) {
      errors.push('Headquarters city is required');
    }

    if (!data.contact?.email?.primary) {
      errors.push('Primary email is required');
    }

    if (!data.contact?.phone?.primary) {
      errors.push('Primary phone is required');
    }

    if (errors.length > 0) {
      throw new AppError(`Validation errors: ${errors.join(', ')}`, 400);
    }

    return true;
  }

  // Private methods
  validateOrganizationData(data) {
    return this.validate(data);
  }

  async checkOrganizationUniqueness(organizationId, registrationNumber = null, subdomain = null) {
    const conditions = [{ organizationId }];
    
    if (registrationNumber) {
      conditions.push({ 'legalInfo.registrationNumber': registrationNumber });
    }
    
    if (subdomain) {
      conditions.push({ 'domain.subdomain': subdomain });
    }

    const existingOrganization = await Organization.findOne({
      $or: conditions,
      isDeleted: false,
    });

    if (existingOrganization) {
      if (existingOrganization.organizationId === organizationId) {
        throw new AppError('Organization ID already exists', 409);
      }
      if (existingOrganization.legalInfo?.registrationNumber === registrationNumber) {
        throw new AppError('Registration number already exists', 409);
      }
      if (existingOrganization.domain?.subdomain === subdomain) {
        throw new AppError('Subdomain already exists', 409);
      }
    }
  }

  async checkSubdomainUniqueness(subdomain) {
    const existing = await Organization.findOne({
      'domain.subdomain': subdomain,
      isDeleted: false,
    });

    if (existing) {
      throw new AppError('Subdomain already exists', 409);
    }
  }

  getDefaultModules(organizationType, plan = 'basic') {
    const baseModules = {
      core: {
        membershipManagement: true,
        userManagement: true,
        basicReporting: true,
      },
      financial: { enabled: false },
      communication: { enabled: false },
      events: { enabled: false },
      governance: { enabled: false },
      education: { enabled: false },
      inventory: { enabled: false },
      hrManagement: { enabled: false },
      analytics: { enabled: false },
    };

    // Type-specific modules
    const typeSpecificModules = {
      professional_chamber: {
        financial: { enabled: true, subscriptionTracking: true },
        governance: { enabled: true, votingSystem: true },
        education: { enabled: true, certificateManagement: true },
      },
      association: {
        communication: { enabled: true, newsletter: true },
        events: { enabled: true, eventManagement: true },
        financial: { enabled: true, donationManagement: true },
      },
      political_party: {
        governance: { enabled: true, votingSystem: true, electionManagement: true },
        communication: { enabled: true, emailCampaigns: true },
        events: { enabled: true, eventManagement: true },
      },
      ngo: {
        communication: { enabled: true, newsletter: true },
        financial: { enabled: true, donationManagement: true },
        hrManagement: { enabled: true, volunteerManagement: true },
      },
      sports_club: {
        events: { enabled: true, eventManagement: true },
        inventory: { enabled: true, equipmentTracking: true },
        financial: { enabled: true, subscriptionTracking: true },
      },
    };

    const modules = { ...baseModules };
    
    if (typeSpecificModules[organizationType]) {
      Object.assign(modules, typeSpecificModules[organizationType]);
    }

    // Plan-specific enhancements
    if (plan === 'premium' || plan === 'enterprise') {
      modules.analytics.enabled = true;
      modules.analytics.advancedReporting = true;
    }

    return modules;
  }

  getDefaultLimits(plan) {
    const limits = {
      basic: {
        maxMembers: 100,
        maxAdmins: 3,
        maxBranches: 1,
        maxStorageGB: 1,
        maxEmailsPerMonth: 500,
        maxSMSPerMonth: 50,
      },
      standard: {
        maxMembers: 500,
        maxAdmins: 10,
        maxBranches: 3,
        maxStorageGB: 5,
        maxEmailsPerMonth: 2000,
        maxSMSPerMonth: 200,
      },
      premium: {
        maxMembers: 2000,
        maxAdmins: 25,
        maxBranches: 10,
        maxStorageGB: 20,
        maxEmailsPerMonth: 10000,
        maxSMSPerMonth: 1000,
      },
      enterprise: {
        maxMembers: -1, // Unlimited
        maxAdmins: -1,
        maxBranches: -1,
        maxStorageGB: 100,
        maxEmailsPerMonth: -1,
        maxSMSPerMonth: 5000,
      },
    };

    return limits[plan] || limits.basic;
  }

  async initializeOrganizationDatabase(organization) {
    try {
      logger.info(`Initializing database for organization: ${organization.organizationId}`);
      
      // Bu method'da:
      // 1. Organization-specific database connection oluşturulacak
      // 2. Index'ler oluşturulacak
      // 3. Varsayılan data seed edilecek
      // 4. İlk admin user oluşturulacak
      
      return true;
    } catch (error) {
      logger.error(`Error initializing database for organization ${organization.organizationId}:`, error);
      throw error;
    }
  }
}

module.exports = OrganizationService;