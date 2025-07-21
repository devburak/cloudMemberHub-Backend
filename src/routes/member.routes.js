const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Member routes available',
    endpoints: {
      getAllMembers: 'GET /api/members',
      createMember: 'POST /api/members',
      getMember: 'GET /api/members/:id',
      updateMember: 'PUT /api/members/:id',
      deleteMember: 'DELETE /api/members/:id',
    },
    timestamp: new Date().toISOString(),
  });
}));

module.exports = router;