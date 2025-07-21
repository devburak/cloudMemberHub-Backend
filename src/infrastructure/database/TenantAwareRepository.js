const IRepository = require('../../shared/interfaces/IRepository');
const tenantContext = require('../../tenant/context/TenantContext');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

class TenantAwareRepository extends IRepository {
  constructor(Model) {
    super();
    this.Model = Model;
    this.tenantConnections = new Map();
  }

  async getTenantModel() {
    const tenantInfo = tenantContext.getCurrentTenant();
    
    if (!tenantInfo) {
      throw new Error('Tenant context not found');
    }

    // Database isolation strategy
    if (tenantInfo.isolationStrategy === 'database') {
      return await this.getTenantDatabaseModel(tenantInfo);
    }
    
    // Schema isolation strategy
    if (tenantInfo.isolationStrategy === 'schema') {
      return await this.getTenantSchemaModel(tenantInfo);
    }

    // Row-level isolation (default model with tenant filter)
    return this.Model;
  }

  async getTenantDatabaseModel(tenantInfo) {
    const tenantId = tenantInfo.tenantId;
    
    // Check if connection already exists
    if (this.tenantConnections.has(tenantId)) {
      const connection = this.tenantConnections.get(tenantId);
      return connection.model(this.Model.modelName, this.Model.schema);
    }

    // Create new connection for tenant
    const dbName = tenantInfo.databaseConfig?.dbName || `cloudmemberhub_${tenantId}`;
    const uri = tenantInfo.databaseConfig?.uri || process.env.MONGODB_URI;
    const tenantUri = uri.replace(/\/[^\/]*$/, `/${dbName}`);

    const connection = mongoose.createConnection(tenantUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    this.tenantConnections.set(tenantId, connection);
    logger.info(`Created database connection for tenant: ${tenantId}`);

    return connection.model(this.Model.modelName, this.Model.schema);
  }

  async getTenantSchemaModel(tenantInfo) {
    // Schema-based isolation (using different collections)
    const tenantSchema = tenantInfo.tenantSchema || tenantInfo.tenantId;
    const collectionName = `${tenantSchema}_${this.Model.collection.name}`;
    
    return mongoose.model(
      `${tenantSchema}_${this.Model.modelName}`,
      this.Model.schema,
      collectionName
    );
  }

  async addTenantFilter(query = {}) {
    const tenantInfo = tenantContext.getCurrentTenant();
    
    if (tenantInfo && tenantInfo.isolationStrategy === 'row') {
      query.tenantId = tenantInfo.tenantId;
    }
    
    return query;
  }

  async create(data) {
    const TenantModel = await this.getTenantModel();
    const tenantInfo = tenantContext.getCurrentTenant();
    
    // Add tenant info for row-level isolation
    if (tenantInfo && tenantInfo.isolationStrategy === 'row') {
      data.tenantId = tenantInfo.tenantId;
      data.tenantName = tenantInfo.tenantName;
    }

    const document = new TenantModel(data);
    return await document.save();
  }

  async findById(id) {
    const TenantModel = await this.getTenantModel();
    const query = await this.addTenantFilter({ _id: id });
    return await TenantModel.findOne(query);
  }

  async findOne(query = {}) {
    const TenantModel = await this.getTenantModel();
    const tenantQuery = await this.addTenantFilter(query);
    return await TenantModel.findOne(tenantQuery);
  }

  async find(query = {}, options = {}) {
    const TenantModel = await this.getTenantModel();
    const tenantQuery = await this.addTenantFilter(query);
    
    let mongoQuery = TenantModel.find(tenantQuery);

    if (options.sort) {
      mongoQuery = mongoQuery.sort(options.sort);
    }
    
    if (options.limit) {
      mongoQuery = mongoQuery.limit(options.limit);
    }
    
    if (options.skip) {
      mongoQuery = mongoQuery.skip(options.skip);
    }
    
    if (options.populate) {
      mongoQuery = mongoQuery.populate(options.populate);
    }
    
    if (options.select) {
      mongoQuery = mongoQuery.select(options.select);
    }

    return await mongoQuery.exec();
  }

  async updateById(id, data) {
    const TenantModel = await this.getTenantModel();
    const query = await this.addTenantFilter({ _id: id });
    
    return await TenantModel.findOneAndUpdate(
      query,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  async updateOne(query, data) {
    const TenantModel = await this.getTenantModel();
    const tenantQuery = await this.addTenantFilter(query);
    
    return await TenantModel.findOneAndUpdate(
      tenantQuery,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  async deleteById(id) {
    const TenantModel = await this.getTenantModel();
    const query = await this.addTenantFilter({ _id: id });
    return await TenantModel.findOneAndDelete(query);
  }

  async deleteOne(query) {
    const TenantModel = await this.getTenantModel();
    const tenantQuery = await this.addTenantFilter(query);
    return await TenantModel.findOneAndDelete(tenantQuery);
  }

  async count(query = {}) {
    const TenantModel = await this.getTenantModel();
    const tenantQuery = await this.addTenantFilter(query);
    return await TenantModel.countDocuments(tenantQuery);
  }

  async exists(query) {
    const TenantModel = await this.getTenantModel();
    const tenantQuery = await this.addTenantFilter(query);
    const result = await TenantModel.findOne(tenantQuery).select('_id').lean();
    return !!result;
  }

  async aggregate(pipeline) {
    const TenantModel = await this.getTenantModel();
    const tenantInfo = tenantContext.getCurrentTenant();
    
    // Add tenant filter to aggregation pipeline for row-level isolation
    if (tenantInfo && tenantInfo.isolationStrategy === 'row') {
      pipeline.unshift({ $match: { tenantId: tenantInfo.tenantId } });
    }
    
    return await TenantModel.aggregate(pipeline);
  }

  async closeTenantConnections() {
    for (const [tenantId, connection] of this.tenantConnections) {
      try {
        await connection.close();
        logger.info(`Closed database connection for tenant: ${tenantId}`);
      } catch (error) {
        logger.error(`Error closing connection for tenant ${tenantId}:`, error);
      }
    }
    this.tenantConnections.clear();
  }
}

module.exports = TenantAwareRepository;