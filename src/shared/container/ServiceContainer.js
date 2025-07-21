class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  // Register a service class
  register(name, ServiceClass, options = {}) {
    const { singleton = false, factory = null } = options;
    
    if (factory) {
      this.factories.set(name, factory);
    } else if (singleton) {
      this.services.set(name, { ServiceClass, singleton: true });
    } else {
      this.services.set(name, { ServiceClass, singleton: false });
    }
  }

  // Register a singleton service
  registerSingleton(name, ServiceClass) {
    this.register(name, ServiceClass, { singleton: true });
  }

  // Register a factory function
  registerFactory(name, factory) {
    this.factories.set(name, factory);
  }

  // Register an existing instance
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
  }

  // Get a service instance
  get(name) {
    // Check if it's a registered instance
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if it's a factory
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      return factory(this);
    }

    // Check if it's a registered service
    if (this.services.has(name)) {
      const { ServiceClass, singleton } = this.services.get(name);
      
      if (singleton) {
        if (!this.singletons.has(name)) {
          const instance = this.createInstance(ServiceClass);
          this.singletons.set(name, instance);
        }
        return this.singletons.get(name);
      } else {
        return this.createInstance(ServiceClass);
      }
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  // Create an instance with dependency injection
  createInstance(ServiceClass) {
    // Get constructor parameters
    const dependencies = this.getDependencies(ServiceClass);
    const resolvedDependencies = dependencies.map(dep => this.get(dep));
    
    return new ServiceClass(...resolvedDependencies);
  }

  // Get dependencies from constructor (simple implementation)
  getDependencies(ServiceClass) {
    // This would typically use reflection or decorators
    // For now, we'll use a static property on the class
    return ServiceClass.dependencies || [];
  }

  // Check if service exists
  has(name) {
    return this.services.has(name) || 
           this.singletons.has(name) || 
           this.factories.has(name);
  }

  // Clear all services
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
  }

  // Get all registered service names
  getRegisteredServices() {
    const serviceNames = new Set();
    
    for (const name of this.services.keys()) {
      serviceNames.add(name);
    }
    
    for (const name of this.singletons.keys()) {
      serviceNames.add(name);
    }
    
    for (const name of this.factories.keys()) {
      serviceNames.add(name);
    }
    
    return Array.from(serviceNames);
  }
}

// Create global container instance
const container = new ServiceContainer();

// Helper decorators for dependency injection
const Injectable = (dependencies = []) => {
  return (target) => {
    target.dependencies = dependencies;
    return target;
  };
};

const Inject = (serviceName) => {
  return (target, propertyKey, parameterIndex) => {
    if (!target.dependencies) {
      target.dependencies = [];
    }
    target.dependencies[parameterIndex] = serviceName;
  };
};

module.exports = {
  ServiceContainer,
  container,
  Injectable,
  Inject,
};