const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createBaseSchema } = require('./BaseEntity');

const userSchema = createBaseSchema({
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
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please provide a valid email address',
    ],
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Password must be at least 8 characters long'],
    select: false, // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['super_admin', 'tenant_admin', 'admin', 'manager', 'user'],
      message: 'Role must be one of: super_admin, tenant_admin, admin, manager, user',
    },
    default: 'user',
    index: true,
  },
  permissions: [{
    type: String,
    enum: [
      'users.read', 'users.write', 'users.delete',
      'members.read', 'members.write', 'members.delete',
      'reports.read', 'reports.write',
      'settings.read', 'settings.write',
      'tenant.manage',
    ],
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLoginAt: Date,
  loginCount: {
    type: Number,
    default: 0,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockoutUntil: Date,
  avatar: {
    url: String,
    publicId: String,
  },
  profile: {
    phone: {
      type: String,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    bio: {
      type: String,
      maxLength: [500, 'Bio cannot exceed 500 characters'],
    },
  },
  preferences: {
    language: {
      type: String,
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
  },
  // Tenant-specific user data
  tenantRoles: [{
    tenantId: String,
    role: String,
    permissions: [String],
    isActive: { type: Boolean, default: true },
    assignedAt: { type: Date, default: Date.now },
  }],
}, {
  collection: 'users',
});

// Compound indexes for multi-tenant queries
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, role: 1, isActive: 1 });
userSchema.index({ tenantId: 1, isActive: 1, isEmailVerified: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = process.env.BCRYPT_SALT_ROUNDS || 12;
    this.password = await bcrypt.hash(this.password, parseInt(saltRounds));
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    tenantId: this.tenantId,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

userSchema.methods.generateRefreshToken = function() {
  const payload = {
    id: this._id,
    tokenType: 'refresh',
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

userSchema.methods.hasRole = function(role) {
  return this.role === role;
};

userSchema.methods.getTenantRole = function(tenantId) {
  const tenantRole = this.tenantRoles.find(tr => tr.tenantId === tenantId);
  return tenantRole ? tenantRole.role : null;
};

userSchema.methods.hasTenantPermission = function(tenantId, permission) {
  const tenantRole = this.tenantRoles.find(tr => tr.tenantId === tenantId);
  return tenantRole ? tenantRole.permissions.includes(permission) : false;
};

userSchema.methods.recordLogin = function() {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  this.failedLoginAttempts = 0;
  this.lockoutUntil = undefined;
  return this.save();
};

userSchema.methods.recordFailedLogin = function() {
  this.failedLoginAttempts += 1;
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockoutTime = parseInt(process.env.LOCKOUT_TIME) || 30 * 60 * 1000; // 30 minutes

  if (this.failedLoginAttempts >= maxAttempts) {
    this.lockoutUntil = new Date(Date.now() + lockoutTime);
  }

  return this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email, tenantId = null) {
  const query = { email: email.toLowerCase() };
  if (tenantId) {
    query.tenantId = tenantId;
  }
  return this.findOne(query);
};

userSchema.statics.findActiveUsers = function(tenantId = null) {
  const query = { isActive: true, isDeleted: false };
  if (tenantId) {
    query.tenantId = tenantId;
  }
  return this.find(query);
};

module.exports = mongoose.model('User', userSchema);