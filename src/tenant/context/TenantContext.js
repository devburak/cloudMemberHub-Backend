const { AsyncLocalStorage } = require('async_hooks');

class TenantContext {
  constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage();
  }

  run(tenantInfo, callback) {
    return this.asyncLocalStorage.run(tenantInfo, callback);
  }

  getCurrentTenant() {
    return this.asyncLocalStorage.getStore();
  }

  getTenantId() {
    const tenant = this.getCurrentTenant();
    return tenant?.tenantId || null;
  }

  getTenantInfo() {
    const tenant = this.getCurrentTenant();
    return {
      tenantId: tenant?.tenantId || null,
      tenantName: tenant?.tenantName || null,
      tenantSchema: tenant?.tenantSchema || null,
      tenantConfig: tenant?.tenantConfig || {},
      isolationStrategy: tenant?.isolationStrategy || 'database',
    };
  }

  setCurrentTenant(tenantInfo) {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, tenantInfo);
    }
  }
}

const tenantContext = new TenantContext();

module.exports = tenantContext;