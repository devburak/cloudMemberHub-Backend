const TenantAwareRepository = require('../../infrastructure/database/TenantAwareRepository');
const Tenant = require('../../tenant/models/Tenant');

class TenantRepository extends TenantAwareRepository {
  constructor() {
    super(Tenant);
  }

  // Override methods for tenant-specific logic
  async create(data) {
    // For tenant model, we don't need tenant context
    const tenant = new Tenant(data);
    return await tenant.save();
  }

  async findByTenantId(tenantId) {
    return await Tenant.findByTenantId(tenantId);
  }

  async findBySubdomain(subdomain) {
    return await Tenant.findBySubdomain(subdomain);
  }

  async findActiveTenantsCount() {
    return await Tenant.countDocuments({ status: 'active', isActive: true });
  }

  async findExpiredTrials() {
    return await Tenant.findExpiredTrials();
  }

  async findTenantsNearingLimits(percentage = 80) {
    return await Tenant.aggregate([
      {
        $match: {
          status: 'active',
          isActive: true,
        }
      },
      {
        $addFields: {
          userUsagePercentage: {
            $multiply: [
              { $divide: ['$usage.currentUsers', '$limits.maxUsers'] },
              100
            ]
          },
          memberUsagePercentage: {
            $multiply: [
              { $divide: ['$usage.currentMembers', '$limits.maxMembers'] },
              100
            ]
          },
          storageUsagePercentage: {
            $multiply: [
              { $divide: ['$usage.storageUsedGB', '$limits.maxStorageGB'] },
              100
            ]
          }
        }
      },
      {
        $match: {
          $or: [
            { userUsagePercentage: { $gte: percentage } },
            { memberUsagePercentage: { $gte: percentage } },
            { storageUsagePercentage: { $gte: percentage } }
          ]
        }
      }
    ]);
  }

  async getUsageStatistics() {
    return await Tenant.aggregate([
      {
        $match: {
          isActive: true,
        }
      },
      {
        $group: {
          _id: null,
          totalTenants: { $sum: 1 },
          activeTenants: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          trialingTenants: {
            $sum: { $cond: [{ $eq: ['$subscription.status', 'trialing'] }, 1, 0] }
          },
          totalUsers: { $sum: '$usage.currentUsers' },
          totalMembers: { $sum: '$usage.currentMembers' },
          totalStorageGB: { $sum: '$usage.storageUsedGB' },
          planDistribution: {
            $push: '$subscription.plan'
          }
        }
      },
      {
        $addFields: {
          planCounts: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$planDistribution'] },
                as: 'plan',
                in: {
                  k: '$$plan',
                  v: {
                    $size: {
                      $filter: {
                        input: '$planDistribution',
                        cond: { $eq: ['$$this', '$$plan'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          totalTenants: 1,
          activeTenants: 1,
          trialingTenants: 1,
          totalUsers: 1,
          totalMembers: 1,
          totalStorageGB: 1,
          planCounts: 1,
          _id: 0
        }
      }
    ]);
  }
}

module.exports = TenantRepository;