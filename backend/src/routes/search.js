const express = require('express');
const router = express.Router();

// Placeholder search endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Search endpoint placeholder',
    query: req.query.q || null
  });
});

module.exports = router; 