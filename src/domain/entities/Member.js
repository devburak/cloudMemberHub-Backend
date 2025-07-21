const mongoose = require('mongoose');
const { createBaseSchema } = require('./BaseEntity');

const memberSchema = createBaseSchema({
  // Personal Information
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxLength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxLength: [50, 'Last name cannot exceed 50 characters'],
    },
    middleName: {
      type: String,
      trim: true,
      maxLength: [50, 'Middle name cannot exceed 50 characters'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      required: [true, 'Gender is required'],
    },
    nationality: {
      type: String,
      trim: true,
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed', 'other'],
    },
  },

  // Contact Information
  contactInfo: {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      primary: {
        type: String,
        required: [true, 'Primary phone number is required'],
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
      },
      secondary: {
        type: String,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
      },
    },
    address: {
      current: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: String,
        country: { type: String, required: true },
        postalCode: String,
      },
      permanent: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
        sameAsCurrent: { type: Boolean, default: false },
      },
    },
    emergencyContact: {
      name: { type: String, required: true },
      relationship: { type: String, required: true },
      phone: { 
        type: String, 
        required: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
      },
      email: {
        type: String,
        lowercase: true,
        match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please provide a valid email'],
      },
    },
  },

  // Membership Information
  membership: {
    memberNumber: {
      type: String,
      required: [true, 'Member number is required'],
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['regular', 'premium', 'vip', 'corporate', 'student', 'senior'],
      default: 'regular',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'expired', 'pending'],
      default: 'pending',
      required: true,
      index: true,
    },
    joinDate: {
      type: Date,
      required: [true, 'Join date is required'],
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    renewalDate: Date,
    categories: [{
      type: String,
      enum: ['fitness', 'sports', 'social', 'business', 'academic', 'community'],
    }],
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
  },

  // Financial Information
  financial: {
    membershipFee: {
      amount: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
      frequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'annually', 'one-time'],
        default: 'monthly',
      },
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'online', 'other'],
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'failed'],
      default: 'pending',
    },
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    totalPaid: {
      type: Number,
      default: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
    },
  },

  // Additional Information
  additional: {
    profilePicture: {
      url: String,
      publicId: String,
    },
    documents: [{
      type: {
        type: String,
        enum: ['id_card', 'passport', 'drivers_license', 'utility_bill', 'other'],
        required: true,
      },
      name: String,
      url: String,
      publicId: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    notes: {
      type: String,
      maxLength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    tags: [String],
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },

  // System Information
  system: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'admin', 'import', 'api'],
      default: 'web',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    loginCredentials: {
      hasAccount: { type: Boolean, default: false },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
}, {
  collection: 'members',
});

// Compound indexes for multi-tenant queries
memberSchema.index({ tenantId: 1, 'membership.memberNumber': 1 }, { unique: true });
memberSchema.index({ tenantId: 1, 'membership.status': 1 });
memberSchema.index({ tenantId: 1, 'contactInfo.email': 1 });
memberSchema.index({ tenantId: 1, 'membership.type': 1, 'membership.status': 1 });
memberSchema.index({ tenantId: 1, 'membership.expiryDate': 1 });
memberSchema.index({ tenantId: 1, 'financial.paymentStatus': 1 });

// Text search index
memberSchema.index({
  'personalInfo.firstName': 'text',
  'personalInfo.lastName': 'text',
  'contactInfo.email': 'text',
  'membership.memberNumber': 'text',
});

// Virtual for full name
memberSchema.virtual('fullName').get(function() {
  const { firstName, middleName, lastName } = this.personalInfo;
  return middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
});

// Virtual for age
memberSchema.virtual('age').get(function() {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for membership duration
memberSchema.virtual('membershipDuration').get(function() {
  if (!this.membership.joinDate) return 0;
  const today = new Date();
  const joinDate = new Date(this.membership.joinDate);
  return Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)); // Days
});

// Virtual for days until expiry
memberSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.membership.expiryDate) return null;
  const today = new Date();
  const expiryDate = new Date(this.membership.expiryDate);
  return Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)); // Days
});

// Pre-save middleware
memberSchema.pre('save', function(next) {
  // Auto-generate member number if not provided
  if (!this.membership.memberNumber && this.isNew) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.membership.memberNumber = `MB${timestamp}${random}`.toUpperCase();
  }

  // Calculate next payment date
  if (this.isModified('financial.lastPaymentDate') || this.isModified('financial.membershipFee.frequency')) {
    this.calculateNextPaymentDate();
  }

  // Update last activity
  this.system.lastActivity = new Date();

  next();
});

// Instance methods
memberSchema.methods.calculateNextPaymentDate = function() {
  if (!this.financial.lastPaymentDate) return;

  const lastPayment = new Date(this.financial.lastPaymentDate);
  const frequency = this.financial.membershipFee.frequency;

  switch (frequency) {
    case 'monthly':
      this.financial.nextPaymentDate = new Date(lastPayment.setMonth(lastPayment.getMonth() + 1));
      break;
    case 'quarterly':
      this.financial.nextPaymentDate = new Date(lastPayment.setMonth(lastPayment.getMonth() + 3));
      break;
    case 'annually':
      this.financial.nextPaymentDate = new Date(lastPayment.setFullYear(lastPayment.getFullYear() + 1));
      break;
    default:
      this.financial.nextPaymentDate = null;
  }
};

memberSchema.methods.isExpired = function() {
  return this.membership.expiryDate && new Date() > this.membership.expiryDate;
};

memberSchema.methods.isExpiringSoon = function(days = 30) {
  if (!this.membership.expiryDate) return false;
  const daysUntilExpiry = this.daysUntilExpiry;
  return daysUntilExpiry > 0 && daysUntilExpiry <= days;
};

memberSchema.methods.hasOverduePayment = function() {
  return this.financial.nextPaymentDate && new Date() > this.financial.nextPaymentDate;
};

memberSchema.methods.activate = function() {
  this.membership.status = 'active';
  return this.save();
};

memberSchema.methods.suspend = function(reason) {
  this.membership.status = 'suspended';
  if (reason) {
    this.additional.notes = `${this.additional.notes || ''}\nSuspended: ${reason}`.trim();
  }
  return this.save();
};

memberSchema.methods.renew = function(expiryDate, paymentAmount) {
  this.membership.status = 'active';
  this.membership.expiryDate = expiryDate;
  this.membership.renewalDate = new Date();
  
  if (paymentAmount) {
    this.financial.lastPaymentDate = new Date();
    this.financial.totalPaid += paymentAmount;
    this.financial.paymentStatus = 'paid';
    this.calculateNextPaymentDate();
  }
  
  return this.save();
};

// Static methods
memberSchema.statics.findByMemberNumber = function(memberNumber, tenantId = null) {
  const query = { 'membership.memberNumber': memberNumber };
  if (tenantId) {
    query.tenantId = tenantId;
  }
  return this.findOne(query);
};

memberSchema.statics.findActiveMembers = function(tenantId = null) {
  const query = { 'membership.status': 'active', isDeleted: false };
  if (tenantId) {
    query.tenantId = tenantId;
  }
  return this.find(query);
};

memberSchema.statics.findExpiringMembers = function(days = 30, tenantId = null) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  const query = {
    'membership.expiryDate': { $lte: expiryDate, $gte: new Date() },
    'membership.status': 'active',
    isDeleted: false,
  };
  
  if (tenantId) {
    query.tenantId = tenantId;
  }
  
  return this.find(query);
};

memberSchema.statics.findOverdueMembers = function(tenantId = null) {
  const query = {
    'financial.nextPaymentDate': { $lt: new Date() },
    'financial.paymentStatus': { $ne: 'paid' },
    isDeleted: false,
  };
  
  if (tenantId) {
    query.tenantId = tenantId;
  }
  
  return this.find(query);
};

module.exports = mongoose.model('Member', memberSchema);