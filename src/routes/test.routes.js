const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');
const { validateTenantAccess } = require('../tenant/middleware/tenantMiddleware');
const tenantContext = require('../tenant/context/TenantContext');
const User = require('../domain/entities/User');
const Member = require('../domain/entities/Member');
const Tenant = require('../tenant/models/Tenant');

const router = express.Router();

// Test endpoint to check organization context
router.get('/organization-info', asyncHandler(async (req, res) => {
  const organizationInfo = tenantContext.getCurrentTenant(); // Legacy naming but works for organizations
  
  res.status(200).json({
    success: true,
    message: 'Organization information retrieved successfully',
    data: {
      organizationInfo,
      requestOrganization: req.tenant,
      headers: {
        'x-organization-id': req.headers['x-organization-id'],
        'organization-id': req.headers['organization-id'],
        'x-tenant-id': req.headers['x-tenant-id'], // Legacy support
        'tenant-id': req.headers['tenant-id'], // Legacy support
      },
    },
    timestamp: new Date().toISOString(),
  });
}));

// Legacy endpoint - redirect to organization-info
router.get('/tenant-info', (req, res) => {
  res.redirect('/api/test/organization-info');
});

// Test endpoint to create sample tenant
router.post('/setup-main-tenant', asyncHandler(async (req, res) => {
  try {
    // Check if main tenant already exists
    const existingTenant = await Tenant.findByTenantId('main');
    if (existingTenant) {
      return res.status(200).json({
        success: true,
        message: 'Main tenant already exists',
        data: existingTenant,
      });
    }

    // Create main development tenant
    const mainTenant = new Tenant({
      tenantId: 'main',
      tenantName: 'MemberHub Development',
      displayName: 'MemberHub Dev',
      description: 'Main development tenant for MemberHub',
      domain: {
        subdomain: 'dev',
        customDomain: 'memberhub.com',
        sslEnabled: true,
      },
      status: 'active',
      isActive: true,
      subscription: {
        plan: 'enterprise',
        status: 'active',
        trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingCycle: 'annual',
        currency: 'USD',
      },
      database: {
        isolationStrategy: 'database',
        databaseName: 'cloudmemberhub_main',
        maxConnections: 20,
      },
      features: {
        enabled: [
          'users', 'members', 'reports', 'analytics', 
          'notifications', 'integrations', 'api_access',
          'custom_branding', 'advanced_security', 'priority_support'
        ],
        disabled: [],
      },
      limits: {
        maxUsers: -1, // Unlimited
        maxMembers: -1, // Unlimited
        maxStorageGB: 1000,
        maxApiCallsPerMonth: 1000000,
        rateLimitRequests: 1000,
        rateLimitWindow: 900000,
      },
      settings: {
        timezone: 'Europe/Istanbul',
        language: 'tr',
        dateFormat: 'DD/MM/YYYY',
        currency: 'TRY',
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#64748b',
        },
        security: {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSymbols: false,
          },
          sessionTimeout: 3600000,
          mfaRequired: false,
        },
        notifications: {
          email: {
            enabled: true,
          },
          sms: {
            enabled: false,
          },
        },
      },
      contact: {
        primaryContact: {
          name: 'Development Team',
          email: 'dev@memberhub.com',
          phone: '+90-xxx-xxx-xxxx',
          role: 'Technical Lead',
        },
        technicalContact: {
          name: 'Tech Support',
          email: 'tech@memberhub.com',
          phone: '+90-xxx-xxx-xxxx',
        },
      },
      organization: {
        type: 'company',
        industry: 'Technology',
        size: '11-50',
        website: 'https://memberhub.com',
      },
      api: {
        enabled: true,
        keys: [],
        webhooks: [],
      },
    });

    const savedTenant = await mainTenant.save();

    res.status(201).json({
      success: true,
      message: 'Main development tenant created successfully',
      data: savedTenant,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create main tenant',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}));

// Test endpoint to create sample users (tenant-aware)
router.post('/create-sample-users', 
  validateTenantAccess(['users']),
  asyncHandler(async (req, res) => {
    const tenantInfo = tenantContext.getCurrentTenant();
    
    const sampleUsers = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@memberhub.com',
        password: 'Admin123!',
        role: 'tenant_admin',
        permissions: [
          'users.read', 'users.write', 'users.delete',
          'members.read', 'members.write', 'members.delete',
          'reports.read', 'reports.write',
          'settings.read', 'settings.write',
          'tenant.manage',
        ],
        isActive: true,
        isEmailVerified: true,
      },
      {
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@memberhub.com',
        password: 'Manager123!',
        role: 'manager',
        permissions: [
          'users.read',
          'members.read', 'members.write',
          'reports.read',
        ],
        isActive: true,
        isEmailVerified: true,
      },
      {
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@memberhub.com',
        password: 'User123!',
        role: 'user',
        permissions: ['members.read'],
        isActive: true,
        isEmailVerified: true,
      },
    ];

    const createdUsers = [];

    for (const userData of sampleUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findByEmail(userData.email, tenantInfo.tenantId);
        if (existingUser) {
          createdUsers.push({
            email: userData.email,
            status: 'already_exists',
            user: existingUser,
          });
          continue;
        }

        const user = new User(userData);
        const savedUser = await user.save();
        
        createdUsers.push({
          email: userData.email,
          status: 'created',
          user: savedUser,
        });
      } catch (error) {
        createdUsers.push({
          email: userData.email,
          status: 'failed',
          error: error.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Sample users creation completed',
      tenant: tenantInfo.tenantId,
      data: createdUsers,
      timestamp: new Date().toISOString(),
    });
  })
);

// Test endpoint to create sample members (tenant-aware)
router.post('/create-sample-members',
  validateTenantAccess(['members']),
  asyncHandler(async (req, res) => {
    const tenantInfo = tenantContext.getCurrentTenant();
    
    const sampleMembers = [
      {
        personalInfo: {
          firstName: 'Ahmet',
          lastName: 'Yılmaz',
          dateOfBirth: new Date('1985-05-15'),
          gender: 'male',
          nationality: 'Turkish',
          maritalStatus: 'married',
        },
        contactInfo: {
          email: 'ahmet.yilmaz@email.com',
          phone: {
            primary: '+905551234567',
          },
          address: {
            current: {
              street: 'Atatürk Cad. No: 123',
              city: 'İstanbul',
              country: 'Turkey',
              postalCode: '34000',
            },
          },
          emergencyContact: {
            name: 'Fatma Yılmaz',
            relationship: 'Spouse',
            phone: '+905559876543',
          },
        },
        membership: {
          type: 'premium',
          status: 'active',
          joinDate: new Date('2023-01-15'),
          expiryDate: new Date('2024-01-15'),
          categories: ['fitness', 'sports'],
        },
        financial: {
          membershipFee: {
            amount: 500,
            currency: 'TRY',
            frequency: 'monthly',
          },
          paymentMethod: 'card',
          paymentStatus: 'paid',
          lastPaymentDate: new Date('2024-01-01'),
          totalPaid: 6000,
        },
      },
      {
        personalInfo: {
          firstName: 'Ayşe',
          lastName: 'Demir',
          dateOfBirth: new Date('1990-08-22'),
          gender: 'female',
          maritalStatus: 'single',
        },
        contactInfo: {
          email: 'ayse.demir@email.com',
          phone: {
            primary: '+905552345678',
          },
          address: {
            current: {
              street: 'Cumhuriyet Cad. No: 456',
              city: 'Ankara',
              country: 'Turkey',
              postalCode: '06000',
            },
          },
          emergencyContact: {
            name: 'Mehmet Demir',
            relationship: 'Father',
            phone: '+905558765432',
          },
        },
        membership: {
          type: 'regular',
          status: 'active',
          joinDate: new Date('2023-06-01'),
          expiryDate: new Date('2024-06-01'),
          categories: ['fitness', 'social'],
        },
        financial: {
          membershipFee: {
            amount: 300,
            currency: 'TRY',
            frequency: 'monthly',
          },
          paymentMethod: 'bank_transfer',
          paymentStatus: 'paid',
          lastPaymentDate: new Date('2024-01-01'),
          totalPaid: 2100,
        },
      },
    ];

    const createdMembers = [];

    for (const memberData of sampleMembers) {
      try {
        const member = new Member(memberData);
        const savedMember = await member.save();
        
        createdMembers.push({
          memberNumber: savedMember.membership.memberNumber,
          fullName: savedMember.fullName,
          status: 'created',
          member: savedMember,
        });
      } catch (error) {
        createdMembers.push({
          email: memberData.contactInfo.email,
          status: 'failed',
          error: error.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Sample members creation completed',
      tenant: tenantInfo.tenantId,
      data: createdMembers,
      timestamp: new Date().toISOString(),
    });
  })
);

// Test endpoint to get tenant statistics
router.get('/tenant-stats',
  asyncHandler(async (req, res) => {
    const tenantInfo = tenantContext.getCurrentTenant();
    
    if (!tenantInfo) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
    }

    try {
      const [userCount, memberCount, tenant] = await Promise.all([
        User.countDocuments({ tenantId: tenantInfo.tenantId, isDeleted: false }),
        Member.countDocuments({ tenantId: tenantInfo.tenantId, isDeleted: false }),
        Tenant.findByTenantId(tenantInfo.tenantId),
      ]);

      res.status(200).json({
        success: true,
        message: 'Tenant statistics retrieved successfully',
        data: {
          tenant: {
            id: tenantInfo.tenantId,
            name: tenantInfo.tenantName,
            isolationStrategy: tenantInfo.isolationStrategy,
          },
          statistics: {
            users: userCount,
            members: memberCount,
          },
          limits: tenant ? tenant.limits : null,
          usage: tenant ? tenant.usage : null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tenant statistics',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// Test endpoint to list all tenants (admin only)
router.get('/all-tenants', asyncHandler(async (req, res) => {
  try {
    const tenants = await Tenant.find({ isDeleted: false })
      .select('tenantId tenantName domain status subscription.plan isActive createdAt')
      .limit(50)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'All tenants retrieved successfully',
      data: tenants,
      count: tenants.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tenants',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}));

// Debug endpoint to check middleware chain
router.get('/debug', asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Debug information',
    data: {
      headers: req.headers,
      tenant: req.tenant,
      tenantId: req.tenantId,
      context: tenantContext.getCurrentTenant(),
      url: req.url,
      method: req.method,
    },
    timestamp: new Date().toISOString(),
  });
}));

module.exports = router;