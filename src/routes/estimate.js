const express = require('express');
const pricingEngine = require('../services/pricingEngine');
const { requireFields } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/estimate
 * body: { project_type: string, features: string[] }
 * Used by: the visual calculator, and internally by /api/ai/chat.
 * This never calls the AI — it's pure deterministic pricing logic.
 */
router.post('/', requireFields(['project_type']), async (req, res) => {
  try {
    const estimate = await pricingEngine.calculateEstimate({
      project_type: req.body.project_type,
      features: Array.isArray(req.body.features) ? req.body.features : [],
    });
    res.json(estimate);
  } catch (err) {
    console.error('[POST /api/estimate]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
