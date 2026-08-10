const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../services/db');
const pricingEngine = require('../services/pricingEngine');
const { requireFields } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/quote
 * body: { lead_id, project_data }
 *
 * IMPORTANT: this does NOT generate a formal quote, contract or invoice.
 * It only registers that the lead wants a formal quote, so a human at
 * AXTEC can prepare and send it. Status starts at PENDING_REVIEW.
 */
router.post('/', requireFields(['lead_id']), async (req, res) => {
  try {
    const estimate = await pricingEngine.calculateEstimate(req.body.project_data || {});
    const quote = {
      id: uuid(),
      lead_id: req.body.lead_id,
      project_data: req.body.project_data || {},
      estimated_price_min: estimate.min_price,
      estimated_price_max: estimate.max_price,
      status: 'PENDING_REVIEW',
      created_at: new Date().toISOString(),
    };
    const saved = await db.createQuoteRequest(quote);
    await db.updateLeadStatus(req.body.lead_id, 'QUALIFIED');
    res.status(201).json({ quote_request: saved });
  } catch (err) {
    console.error('[POST /api/quote]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
