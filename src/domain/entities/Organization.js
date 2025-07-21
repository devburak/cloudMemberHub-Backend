const mongoose = require('mongoose');
const { createBaseSchema } = require('./BaseEntity');

const organizationSchema = createBaseSchema({
  // Basic Organization Information
  organizationId: {
    type: String,
    required: [true, 'Organization ID is required'],
    unique: true,
    trim: true,
    match: [/^[a-zA-Z0-9_-]+$/, 'Organization ID can only contain letters, numbers, hyphens, and underscores'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxLength: [200, 'Organization name cannot exceed 200 characters'],
  },
  shortName: {
    type: String,
    trim: true,
    maxLength: [50, 'Short name cannot exceed 50 characters'],
  },
  description: {
    type: String,
    maxLength: [1000, 'Description cannot exceed 1000 characters'],
  },

  // Organization Type and Industry
  type: {
    type: String,
    enum: {
      values: [
        'association', // Dernek
        'professional_chamber', // Meslek Odası
        'political_party', // Siyasi Parti
        'ngo', // STK
        'foundation', // Vakıf
        'cooperative', // Kooperatif
        'union', // Sendika
        'sports_club', // Spor Kulübü
        'cultural_organization', // Kültür Kuruluşu
        'religious_organization', // Dini Kuruluş
        'educational_institution', // Eğitim Kurumu
        'other'
      ],
      message: 'Invalid organization type'
    },
    required: [true, 'Organization type is required'],
    index: true,
  },
  industry: {
    type: String,
    enum: [
      'healthcare', 'engineering', 'law', 'education', 'technology',
      'finance', 'agriculture', 'manufacturing', 'construction',
      'arts_culture', 'sports', 'environment', 'human_rights',
      'social_services', 'political', 'religious', 'other'
    ],
  },
  category: {
    type: String,
    enum: [
      'professional', 'social', 'cultural', 'educational', 
      'environmental', 'charitable', 'political', 'religious', 
      'sports', 'hobby', 'advocacy', 'other'
    ],
  },

  // Legal Information
  legalInfo: {
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      index: true,
    },
    taxId: String,
    legalForm: {
      type: String,
      enum: ['association', 'foundation', 'company', 'cooperative', 'other'],
      required: true,
    },
    establishedDate: {
      type: Date,
      required: [true, 'Established date is required'],
    },
    registrationAuthority: String, // Kayıt makamı
    activityPermits: [{
      type: String,
      description: String,
      issueDate: Date,
      expiryDate: Date,
    }],
  },

  // Address Information
  address: {
    headquarters: {
      street: { type: String, required: true },
      district: String,
      city: { type: String, required: true },
      province: { type: String, required: true },
      country: { type: String, required: true, default: 'Turkey' },
      postalCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    branches: [{
      name: String,
      street: String,
      district: String,
      city: String,
      province: String,
      country: String,
      postalCode: String,
      isActive: { type: Boolean, default: true },
      contactPerson: String,
      phone: String,
      email: String,
    }],
  },

  // Contact Information
  contact: {
    phone: {
      primary: {
        type: String,
        required: [true, 'Primary phone is required'],
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
      },
      secondary: String,
      fax: String,
    },
    email: {
      primary: {
        type: String,
        required: [true, 'Primary email is required'],
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
      },
      support: String,
      info: String,
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL'],
    },
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      youtube: String,
    },
  },

  // Leadership Structure
  leadership: {
    chairman: {
      name: String,
      email: String,
      phone: String,
      startDate: Date,
      endDate: Date,
    },
    viceChairman: {
      name: String,
      email: String,
      phone: String,
    },
    secretary: {
      name: String,
      email: String,
      phone: String,
    },
    treasurer: {
      name: String,
      email: String,
      phone: String,
    },
    boardMembers: [{
      name: String,
      position: String,
      email: String,
      phone: String,
      startDate: Date,
      endDate: Date,
      isActive: { type: Boolean, default: true },
    }],
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

  // Subscription and Service Plan
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'standard', 'premium', 'enterprise', 'custom'],
      default: 'basic',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled', 'trial', 'expired'],
      default: 'trial',
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      default: 'annual',
    },
    currency: {
      type: String,
      default: 'TRY',
      maxLength: 3,
    },
    customPricing: {
      monthlyRate: Number,
      setupFee: Number,
      discountPercent: Number,
    },
  },

  // Active Modules and Features
  modules: {
    core: {
      membershipManagement: { type: Boolean, default: true },
      userManagement: { type: Boolean, default: true },
      basicReporting: { type: Boolean, default: true },
    },
    financial: {
      enabled: { type: Boolean, default: false },
      subscriptionTracking: { type: Boolean, default: false },
      donationManagement: { type: Boolean, default: false },
      expenseTracking: { type: Boolean, default: false },
      budgetManagement: { type: Boolean, default: false },
      financialReporting: { type: Boolean, default: false },
    },
    communication: {
      enabled: { type: Boolean, default: false },
      emailCampaigns: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: false },
      newsletter: { type: Boolean, default: false },
      announcements: { type: Boolean, default: false },
    },
    events: {
      enabled: { type: Boolean, default: false },
      eventManagement: { type: Boolean, default: false },
      registrationSystem: { type: Boolean, default: false },
      ticketingSales: { type: Boolean, default: false },
      venueManagement: { type: Boolean, default: false },
      attendanceTracking: { type: Boolean, default: false },
    },
    governance: {
      enabled: { type: Boolean, default: false },
      votingSystem: { type: Boolean, default: false },
      meetingManagement: { type: Boolean, default: false },
      documentManagement: { type: Boolean, default: false },
      committeeManagement: { type: Boolean, default: false },
      electionManagement: { type: Boolean, default: false },
    },
    education: {
      enabled: { type: Boolean, default: false },
      courseManagement: { type: Boolean, default: false },
      certificateManagement: { type: Boolean, default: false },
      examSystem: { type: Boolean, default: false },
      learningManagement: { type: Boolean, default: false },
    },
    inventory: {
      enabled: { type: Boolean, default: false },
      assetManagement: { type: Boolean, default: false },
      equipmentTracking: { type: Boolean, default: false },
      maintenanceScheduling: { type: Boolean, default: false },
    },
    hrManagement: {
      enabled: { type: Boolean, default: false },
      employeeManagement: { type: Boolean, default: false },
      volunteerManagement: { type: Boolean, default: false },
      payrollSystem: { type: Boolean, default: false },
      performanceTracking: { type: Boolean, default: false },
    },
    analytics: {
      enabled: { type: Boolean, default: false },
      advancedReporting: { type: Boolean, default: false },
      dashboards: { type: Boolean, default: false },
      dataExport: { type: Boolean, default: false },
      businessIntelligence: { type: Boolean, default: false },
    },
  },

  // Usage Limits and Quotas
  limits: {
    maxMembers: {
      type: Number,
      default: 100,
      min: 1,
    },
    maxAdmins: {
      type: Number,
      default: 5,
      min: 1,
    },
    maxBranches: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxStorageGB: {
      type: Number,
      default: 1,
      min: 0.1,
    },
    maxEmailsPerMonth: {
      type: Number,
      default: 1000,
      min: 100,
    },
    maxSMSPerMonth: {
      type: Number,
      default: 100,
      min: 0,
    },
  },

  // Current Usage Statistics
  usage: {
    currentMembers: { type: Number, default: 0 },
    currentAdmins: { type: Number, default: 0 },
    currentBranches: { type: Number, default: 1 },
    storageUsedGB: { type: Number, default: 0 },
    emailsSentThisMonth: { type: Number, default: 0 },
    smsSentThisMonth: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    lastLoginAt: Date,
  },

  // Settings and Configuration
  settings: {
    general: {
      timezone: { type: String, default: 'Europe/Istanbul' },
      language: { type: String, default: 'tr' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      currency: { type: String, default: 'TRY' },
      fiscalYearStart: { type: String, default: '01-01' }, // MM-DD format
    },
    membership: {
      membershipTypes: [{
        name: { type: String, required: true },
        description: String,
        annualFee: Number,
        currency: String,
        isActive: { type: Boolean, default: true },
        benefits: [String],
        requirements: [String],
      }],
      autoApproval: { type: Boolean, default: false },
      requiresBoard: { type: Boolean, default: true },
      membershipDuration: { type: Number, default: 12 }, // months
      reminderDays: { type: Number, default: 30 },
    },
    branding: {
      logoUrl: String,
      primaryColor: { type: String, default: '#2563eb' },
      secondaryColor: { type: String, default: '#64748b' },
      customCSS: String,
      favicon: String,
    },
    security: {
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSymbols: { type: Boolean, default: false },
      },
      sessionTimeout: { type: Number, default: 3600000 }, // 1 hour
      twoFactorRequired: { type: Boolean, default: false },
      ipWhitelist: [String],
      maxLoginAttempts: { type: Number, default: 5 },
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
        provider: { type: String, enum: ['twilio', 'nexmo', 'local'] },
        config: mongoose.Schema.Types.Mixed,
      },
    },
  },

  // Data Isolation Configuration
  dataIsolation: {
    strategy: {
      type: String,
      enum: ['database', 'schema', 'row'],
      default: 'database',
      required: true,
    },
    databaseName: String,
    schemaName: String,
  },

  // API and Integration Settings
  integrations: {
    api: {
      enabled: { type: Boolean, default: false },
      keys: [{
        name: String,
        keyId: String,
        permissions: [String],
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        lastUsedAt: Date,
        expiresAt: Date,
      }],
    },
    webhooks: [{
      name: String,
      url: String,
      events: [String],
      isActive: { type: Boolean, default: true },
      secret: String,
      lastTriggered: Date,
    }],
    thirdParty: {
      accountingSystem: {
        enabled: Boolean,
        provider: String,
        config: mongoose.Schema.Types.Mixed,
      },
      paymentGateway: {
        enabled: Boolean,
        provider: String,
        config: mongoose.Schema.Types.Mixed,
      },
      emailService: {
        provider: String,
        config: mongoose.Schema.Types.Mixed,
      },
    },
  },

  // Compliance and Legal
  compliance: {
    dataProtection: {
      gdprCompliant: { type: Boolean, default: true },
      kvkkCompliant: { type: Boolean, default: true },
      dataRetentionYears: { type: Number, default: 7 },
    },
    reporting: {
      annualReportRequired: { type: Boolean, default: true },
      financialAuditRequired: { type: Boolean, default: false },
      lastAuditDate: Date,
      nextAuditDate: Date,
    },
  },

  // Status and Lifecycle
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_approval', 'cancelled'],
    default: 'pending_approval',
    index: true,
  },
  
  // Metadata and Custom Fields
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  customFields: [{
    name: String,
    type: String,
    value: mongoose.Schema.Types.Mixed,
    isRequired: Boolean,
  }],
}, {
  collection: 'organizations',
});

// Remove tenant fields since this IS the organization model
organizationSchema.remove(['tenantId', 'tenantName']);

// Indexes
organizationSchema.index({ organizationId: 1 }, { unique: true });
organizationSchema.index({ 'legalInfo.registrationNumber': 1 }, { unique: true });
organizationSchema.index({ 'domain.subdomain': 1 }, { unique: true });
organizationSchema.index({ type: 1, status: 1 });
organizationSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });
organizationSchema.index({ 'address.headquarters.city': 1, 'address.headquarters.province': 1 });

// Virtual fields
organizationSchema.virtual('fullDomain').get(function() {
  return this.domain.customDomain || `${this.domain.subdomain}.${process.env.BASE_DOMAIN || 'memberhub.com'}`;
});

organizationSchema.virtual('isTrialExpired').get(function() {
  return this.subscription.trialEndsAt && new Date() > this.subscription.trialEndsAt;
});

organizationSchema.virtual('usagePercentage').get(function() {
  return {
    members: this.limits.maxMembers > 0 ? Math.round((this.usage.currentMembers / this.limits.maxMembers) * 100) : 0,
    storage: this.limits.maxStorageGB > 0 ? Math.round((this.usage.storageUsedGB / this.limits.maxStorageGB) * 100) : 0,
    admins: this.limits.maxAdmins > 0 ? Math.round((this.usage.currentAdmins / this.limits.maxAdmins) * 100) : 0,
  };
});

// Instance methods
organizationSchema.methods.hasModule = function(moduleName, feature = null) {
  const module = this.modules[moduleName];
  if (!module) return false;
  if (!feature) return module.enabled;
  return module.enabled && module[feature];
};

organizationSchema.methods.isWithinLimits = function() {
  return {
    members: this.usage.currentMembers < this.limits.maxMembers,
    admins: this.usage.currentAdmins < this.limits.maxAdmins,
    storage: this.usage.storageUsedGB < this.limits.maxStorageGB,
    emails: this.usage.emailsSentThisMonth < this.limits.maxEmailsPerMonth,
    sms: this.usage.smsSentThisMonth < this.limits.maxSMSPerMonth,
  };
};

organizationSchema.methods.updateUsage = function(type, increment = 1) {
  const usageMap = {
    members: 'currentMembers',
    admins: 'currentAdmins',
    storage: 'storageUsedGB',
    emails: 'emailsSentThisMonth',
    sms: 'smsSentThisMonth',
  };

  if (usageMap[type]) {
    this.usage[usageMap[type]] += increment;
    this.usage.lastActivityAt = new Date();
  }
  
  return this.save();
};

// Static methods
organizationSchema.statics.findByOrganizationId = function(organizationId) {
  return this.findOne({ organizationId, status: { $ne: 'cancelled' } });
};

organizationSchema.statics.findBySubdomain = function(subdomain) {
  return this.findOne({ 'domain.subdomain': subdomain, status: 'active' });
};

organizationSchema.statics.findByType = function(type) {
  return this.find({ type, status: 'active' });
};

module.exports = mongoose.model('Organization', organizationSchema);