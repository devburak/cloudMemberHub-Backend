const { container } = require('../../shared/container/ServiceContainer');

// Infrastructure services
const TenantAwareRepository = require('../database/TenantAwareRepository');

// Services
const UserService = require('../../services/UserService');
const AuthService = require('../../services/AuthService');
const TenantService = require('../../domain/services/TenantService');

// Controllers
const AuthController = require('../../controllers/AuthController');
const UserController = require('../../controllers/UserController');

// Register infrastructure services
container.registerSingleton('TenantAwareRepository', TenantAwareRepository);

// Register repositories
container.registerFactory('UserRepository', (container) => {
  return container.get('TenantAwareRepository');
});

container.registerFactory('TenantRepository', (container) => {
  return container.get('TenantAwareRepository');
});

// Register services
container.registerFactory('UserService', (container) => {
  const userRepository = container.get('UserRepository');
  const tenantService = container.get('TenantService');
  const userService = new UserService(userRepository, tenantService);
  return userService;
});

container.registerFactory('AuthService', (container) => {
  const userService = container.get('UserService');
  const tenantService = container.get('TenantService');
  const authService = new AuthService(userService, tenantService, null); // EmailService can be added later
  return authService;
});

container.registerFactory('TenantService', (container) => {
  const tenantRepository = container.get('TenantRepository');
  const tenantService = new TenantService(tenantRepository);
  return tenantService;
});

// Initialize controllers with services
try {
  const authService = container.get('AuthService');
  const userService = container.get('UserService');
  
  AuthController.setAuthService(authService);
  UserController.setUserService(userService);
  
  console.log('Service container initialized with registered services and controllers');
} catch (error) {
  console.error('Error initializing service container:', error);
}

module.exports = container;