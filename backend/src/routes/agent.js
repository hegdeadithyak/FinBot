const express = require('express');
const router = express.Router();

router.get('/info', (req, res) => {
  // Placeholder agent info
  res.json({
    agentId: 'agent-123',
    name: 'FinBot Agent',
    version: '1.0.0',
    description: 'AI-powered financial assistant',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router; 