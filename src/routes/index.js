const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const memberRoutes = require('./member.routes');
const testRoutes = require('./test.routes');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/members',
    route: memberRoutes,
  },
  {
    path: '/test',
    route: testRoutes,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CloudMemberHub API v1 - Multi-Tenant SOA',
    version: '1.0.0',
    architecture: 'SOA + Multi-Tenant',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      members: '/api/members',
      test: '/api/test',
    },
    testEndpoints: {
      setupMainTenant: 'POST /api/test/setup-main-tenant',
      tenantInfo: 'GET /api/test/tenant-info',
      createSampleUsers: 'POST /api/test/create-sample-users',
      createSampleMembers: 'POST /api/test/create-sample-members',
      tenantStats: 'GET /api/test/tenant-stats',
      allTenants: 'GET /api/test/all-tenants',
      debug: 'GET /api/test/debug',
    },
    multiTenant: {
      strategies: ['header', 'subdomain', 'path'],
      defaultStrategy: process.env.TENANT_STRATEGY || 'header',
      isolationStrategies: ['database', 'schema', 'row'],
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;