const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const memberRoutes = require('./member.routes');

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
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CloudMemberHub API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      members: '/api/members',
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;