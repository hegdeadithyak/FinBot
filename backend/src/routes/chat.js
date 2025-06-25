const express = require('express');
const router = express.Router();

// Placeholder for MistralAgent
const agent = {
  getAgentInfo: () => ({
    agentId: 'agent-123',
    model: 'mistral-large',
  })
};

router.get('/health', (req, res) => {
  const agentInfo = agent.getAgentInfo();
  res.json({
    status: 'ok',
    ok: true,
    agentId: agentInfo.agentId,
    model: agentInfo.model,
    timestamp: new Date().toISOString(),
    server: 'FinBot Agent API',
  });
});

module.exports = router; 