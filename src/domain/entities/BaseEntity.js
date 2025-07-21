const mongoose = require('mongoose');

const baseEntitySchema = {
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  version: {
    type: Number,
    default: 1,
  },
};

// Multi-tenant fields (for row-level isolation)
const multiTenantFields = {
  tenantId: {
    type: String,
    required: function() {
      // Tenant ID required for row-level isolation
      const tenantContext = require('../../tenant/context/TenantContext');
      const tenant = tenantContext.getCurrentTenant();
      return tenant?.isolationStrategy === 'row';
    },
    index: true,
  },
  tenantName: {
    type: String,
    required: function() {
      const tenantContext = require('../../tenant/context/TenantContext');
      const tenant = tenantContext.getCurrentTenant();
      return tenant?.isolationStrategy === 'row';
    },
  },
};

// Base schema options
const baseSchemaOptions = {
  timestamps: true,
  versionKey: 'version',
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      if (ret.isDeleted) {
        return null; // Don't return deleted documents
      }
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

// Soft delete middleware
const addSoftDeleteMiddleware = (schema) => {
  // Pre-save middleware to update timestamps
  schema.pre('save', function(next) {
    this.updatedAt = new Date();
    if (this.isModified('isDeleted') && this.isDeleted) {
      this.deletedAt = new Date();
    }
    next();
  });

  // Pre-update middleware
  schema.pre(['updateOne', 'findOneAndUpdate'], function() {
    this.set({ updatedAt: new Date() });
  });

  // Soft delete methods
  schema.methods.softDelete = function(deletedBy = null) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (deletedBy) {
      this.deletedBy = deletedBy;
    }
    return this.save();
  };

  schema.methods.restore = function() {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    return this.save();
  };

  // Query helpers
  schema.query.active = function() {
    return this.where({ isDeleted: { $ne: true } });
  };

  schema.query.deleted = function() {
    return this.where({ isDeleted: true });
  };
};

// Create base schema function
const createBaseSchema = (definition, options = {}) => {
  const schemaDefinition = {
    ...definition,
    ...baseEntitySchema,
    ...multiTenantFields,
  };

  const schemaOptions = {
    ...baseSchemaOptions,
    ...options,
  };

  const schema = new mongoose.Schema(schemaDefinition, schemaOptions);
  
  // Add soft delete middleware
  addSoftDeleteMiddleware(schema);

  // Add tenant index for row-level isolation
  schema.index({ tenantId: 1, isDeleted: 1 });

  return schema;
};

module.exports = {
  baseEntitySchema,
  multiTenantFields,
  baseSchemaOptions,
  createBaseSchema,
  addSoftDeleteMiddleware,
};