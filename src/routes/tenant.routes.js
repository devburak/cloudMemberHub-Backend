const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');
const apiKeyMiddleware = require('../middleware/apiKey.middleware');
const TenantService = require('../domain/services/TenantService');

const router = express.Router();
const tenantService = new TenantService();

router.post('/', apiKeyMiddleware(), asyncHandler(async (req, res) => {
  const tenant = await tenantService.create(req.body);
  res.status(201).json({
    success: true,
    message: 'Tenant created successfully',
    data: tenant,
    timestamp: new Date().toISOString(),
  });
}));

router.get('/:tenantId', asyncHandler(async (req, res) => {
  const tenant = await tenantService.getById(req.params.tenantId);
  res.status(200).json({
    success: true,
    message: 'Tenant retrieved successfully',
    data: tenant,
    timestamp: new Date().toISOString(),
  });
}));

module.exports = router;
