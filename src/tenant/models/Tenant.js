const mongoose = require('mongoose');
const { createBaseSchema } = require('../../domain/entities/BaseEntity');

const tenantSchema = createBaseSchema({
  // Basic Information
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    unique: true,
    trim: true,
    match: [/^[a-zA-Z0-9_-]+$/, 'Tenant ID can only contain letters, numbers, hyphens, and underscores'],
    index: true,
  },
  tenantName: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
    maxLength: [100, 'Tenant name cannot exceed 100 characters'],
  },
  displayName: {
    type: String,
    trim: true,
    maxLength: [100, 'Display name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    maxLength: [500, 'Description cannot exceed 500 characters'],
  },

  // Domain Configuration
  domain: {
    subdomain: {
      type: String,
      required: [true, 'Subdomain is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'],
      index: true,
    },
    customDomain: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Please provide a valid domain'],
    },
    sslEnabled: {
      type: Boolean,
      default: true,
    },
  },

  // Status and Lifecycle
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'pending', 'trial', 'expired'],
      message: 'Status must be one of: active, inactive, suspended, pending, trial, expired',
    },
    default: 'pending',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },

  // Subscription and Billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'standard', 'premium', 'enterprise'],
      default: 'free',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'trialing', 'unpaid'],
      default: 'trialing',
    },
    trialEndsAt: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly',
    },
    currency: {
      type: String,
      default: 'USD',
      maxLength: 3,
    },
  },

  // Database Configuration
  database: {
    isolationStrategy: {
      type: String,
      enum: ['database', 'schema', 'row'],
      default: 'database',
      required: true,
    },
    connectionString: String,
    databaseName: String,
    schemaName: String,
    maxConnections: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
  },

  // Features and Limits
  features: {
    enabled: [{
      type: String,
      enum: [
        'users', 'members', 'reports', 'analytics', 
        'notifications', 'integrations', 'api_access',
        'custom_branding', 'advanced_security', 'priority_support'
      ],
    }],
    disabled: [String],
  },

  limits: {
    maxUsers: {
      type: Number,
      default: 10,
      min: 1,
    },
    maxMembers: {
      type: Number,
      default: 100,
      min: 1,
    },
    maxStorageGB: {
      type: Number,
      default: 1,
      min: 0.1,
    },
    maxApiCallsPerMonth: {
      type: Number,
      default: 1000,
      min: 100,
    },
    rateLimitRequests: {
      type: Number,
      default: 100,
      min: 10,
    },
    rateLimitWindow: {
      type: Number,
      default: 900000, // 15 minutes
      min: 60000, // 1 minute
    },
  },

  // Configuration and Settings
  settings: {
    timezone: {
      type: String,
      default: 'UTC',
    },
    language: {
      type: String,
      default: 'en',
      maxLength: 5,
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD',
    },
    currency: {
      type: String,
      default: 'USD',
      maxLength: 3,
    },
    theme: {
      primaryColor: String,
      secondaryColor: String,
      logoUrl: String,
      faviconUrl: String,
    },
    security: {
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSymbols: { type: Boolean, default: false },
      },
      sessionTimeout: {
        type: Number,
        default: 3600000, // 1 hour
      },
      mfaRequired: {
        type: Boolean,
        default: false,
      },
      ipWhitelist: [String],
    },
    notifications: {
      email: {
        enabled: { type: Boolean, default: true },
        smtpConfig: {
          host: String,
          port: Number,
          secure: Boolean,
          username: String,
          password: String,
        },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        provider: String,
        config: mongoose.Schema.Types.Mixed,
      },
    },
  },

  // Contact Information
  contact: {
    primaryContact: {
      name: String,
      email: String,
      phone: String,
      role: String,
    },
    billingContact: {
      name: String,
      email: String,
      phone: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
      },
    },
    technicalContact: {
      name: String,
      email: String,
      phone: String,
    },
  },

  // Organization Information
  organization: {
    type: {
      type: String,
      enum: ['company', 'nonprofit', 'government', 'education', 'individual'],
    },
    industry: String,
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
    },
    website: String,
    taxId: String,
  },

  // Usage and Analytics
  usage: {
    currentUsers: { type: Number, default: 0 },
    currentMembers: { type: Number, default: 0 },
    storageUsedGB: { type: Number, default: 0 },
    apiCallsThisMonth: { type: Number, default: 0 },
    lastActivityAt: Date,
    lastBillingAt: Date,
  },

  // Integration and API
  api: {
    enabled: { type: Boolean, default: false },
    keys: [{
      name: String,
      keyId: String,
      permissions: [String],
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      lastUsedAt: Date,
    }],
    webhooks: [{
      url: String,
      events: [String],
      isActive: { type: Boolean, default: true },
      secret: String,
    }],
  },

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },

  // Audit Trail
  auditLog: [{
    action: String,
    performedBy: {
      userId: String,
      userEmail: String,
      userRole: String,
    },
    details: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
  }],
}, {
  collection: 'tenants',
  // Override tenant fields since this is the tenant model itself
  discriminatorKey: null,
});

// Remove tenant fields from the tenant model itself
tenantSchema.remove(['tenantId', 'tenantName']);

// Indexes
tenantSchema.index({ tenantId: 1 }, { unique: true });
tenantSchema.index({ 'domain.subdomain': 1 }, { unique: true });
tenantSchema.index({ status: 1, isActive: 1 });
tenantSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });
tenantSchema.index({ 'usage.lastActivityAt': 1 });

// Virtual for full domain
tenantSchema.virtual('fullDomain').get(function() {
  return this.domain.customDomain || `${this.domain.subdomain}.${process.env.BASE_DOMAIN || 'cloudmemberhub.com'}`;
});

// Virtual for is trial expired
tenantSchema.virtual('isTrialExpired').get(function() {
  return this.subscription.trialEndsAt && new Date() > this.subscription.trialEndsAt;
});

// Virtual for usage percentage
tenantSchema.virtual('usagePercentage').get(function() {
  return {
    users: Math.round((this.usage.currentUsers / this.limits.maxUsers) * 100),
    members: Math.round((this.usage.currentMembers / this.limits.maxMembers) * 100),
    storage: Math.round((this.usage.storageUsedGB / this.limits.maxStorageGB) * 100),
  };
});

// Pre-save middleware
tenantSchema.pre('save', function(next) {
  // Generate database name if not provided
  if (!this.database.databaseName && this.isNew) {
    this.database.databaseName = `cloudmemberhub_${this.tenantId}`;
  }

  // Set display name to tenant name if not provided
  if (!this.displayName) {
    this.displayName = this.tenantName;
  }

  next();
});

// Instance methods
tenantSchema.methods.hasFeature = function(feature) {
  return this.features.enabled.includes(feature) && !this.features.disabled.includes(feature);
};

tenantSchema.methods.isWithinLimits = function() {
  return {
    users: this.usage.currentUsers < this.limits.maxUsers,
    members: this.usage.currentMembers < this.limits.maxMembers,
    storage: this.usage.storageUsedGB < this.limits.maxStorageGB,
    apiCalls: this.usage.apiCallsThisMonth < this.limits.maxApiCallsPerMonth,
  };
};

tenantSchema.methods.updateUsage = function(type, increment = 1) {
  switch (type) {
    case 'users':
      this.usage.currentUsers += increment;
      break;
    case 'members':
      this.usage.currentMembers += increment;
      break;
    case 'storage':
      this.usage.storageUsedGB += increment;
      break;
    case 'api':
      this.usage.apiCallsThisMonth += increment;
      break;
  }
  this.usage.lastActivityAt = new Date();
  return this.save();
};

tenantSchema.methods.addAuditLog = function(action, performedBy, details = {}, req = null) {
  this.auditLog.push({
    action,
    performedBy,
    details,
    ipAddress: req?.ip,
    userAgent: req?.get('User-Agent'),
  });
  return this.save();
};

tenantSchema.methods.activate = function() {
  this.status = 'active';
  this.isActive = true;
  return this.save();
};

tenantSchema.methods.suspend = function(reason) {
  this.status = 'suspended';
  this.isActive = false;
  if (reason) {
    this.metadata.set('suspensionReason', reason);
  }
  return this.save();
};

tenantSchema.methods.upgradeSubscription = function(newPlan) {
  this.subscription.plan = newPlan;
  this.subscription.status = 'active';
  
  // Update limits based on plan
  switch (newPlan) {
    case 'basic':
      this.limits.maxUsers = 50;
      this.limits.maxMembers = 500;
      this.limits.maxStorageGB = 5;
      break;
    case 'standard':
      this.limits.maxUsers = 100;
      this.limits.maxMembers = 1000;
      this.limits.maxStorageGB = 25;
      break;
    case 'premium':
      this.limits.maxUsers = 500;
      this.limits.maxMembers = 5000;
      this.limits.maxStorageGB = 100;
      break;
    case 'enterprise':
      this.limits.maxUsers = -1; // Unlimited
      this.limits.maxMembers = -1;
      this.limits.maxStorageGB = 1000;
      break;
  }
  
  return this.save();
};

// Static methods
tenantSchema.statics.findByTenantId = function(tenantId) {
  return this.findOne({ tenantId, isActive: true });
};

tenantSchema.statics.findBySubdomain = function(subdomain) {
  return this.findOne({ 'domain.subdomain': subdomain, isActive: true });
};

tenantSchema.statics.findActiveTenants = function() {
  return this.find({ status: 'active', isActive: true });
};

tenantSchema.statics.findExpiredTrials = function() {
  return this.find({
    'subscription.status': 'trialing',
    'subscription.trialEndsAt': { $lt: new Date() },
    isActive: true,
  });
};

module.exports = mongoose.model('Tenant', tenantSchema);