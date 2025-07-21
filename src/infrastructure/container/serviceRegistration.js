const { container } = require('../../shared/container/ServiceContainer');

// Infrastructure services
const TenantAwareRepository = require('../database/TenantAwareRepository');

// Domain services (will be created)
// const UserService = require('../../domain/services/UserService');
// const MemberService = require('../../domain/services/MemberService');
// const TenantService = require('../../domain/services/TenantService');

// Application services (will be created)
// const UserUseCase = require('../../application/useCases/UserUseCase');
// const MemberUseCase = require('../../application/useCases/MemberUseCase');

// Repositories (will be created)
// const UserRepository = require('../../domain/repositories/UserRepository');
// const MemberRepository = require('../../domain/repositories/MemberRepository');

// Register infrastructure services
container.registerSingleton('TenantAwareRepository', TenantAwareRepository);

// Register repositories when they are created
// container.registerFactory('UserRepository', (container) => {
//   return new UserRepository(UserModel);
// });

// container.registerFactory('MemberRepository', (container) => {
//   return new MemberRepository(MemberModel);
// });

// Register domain services when they are created
// container.registerSingleton('UserService', UserService);
// container.registerSingleton('MemberService', MemberService);
// container.registerSingleton('TenantService', TenantService);

// Register use cases when they are created
// container.registerFactory('UserUseCase', (container) => {
//   const userService = container.get('UserService');
//   const userRepository = container.get('UserRepository');
//   return new UserUseCase(userService, userRepository);
// });

console.log('Service container initialized with registered services');

module.exports = container;