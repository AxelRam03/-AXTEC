const express = require('express');
const db = require('../services/db');
const cache = require('../services/cache');
const { requireAdminKey, requireFields } = require('../middleware/security');

const router = express.Router();

const PRICING_CACHE_KEY = 'pricing:active_rules';
const PRICING_CACHE_TTL_SECONDS = Number(process.env.PRICING_CACHE_TTL_SECONDS || 30);

/**
 * GET /api/pricing — public, read-only.
 * Used by the frontend calculator/comparator to stay in sync with real rates.
 * Cached briefly (default 30s) since this is called often and rules change
 * rarely — cuts DB/JSON reads under load without risking stale prices for
 * more than a few seconds after an admin edit.
 */
router.get('/', async (req, res) => {
  try {
    let rules = await cache.get(PRICING_CACHE_KEY);
    if (!rules) {
      rules = await db.getPricingRules();
      await cache.set(PRICING_CACHE_KEY, rules, PRICING_CACHE_TTL_SECONDS);
    }
    res.json({
      currency: 'MXN',
      disclaimer: 'Indicative ranges. Not a final price. See /api/estimate or talk to AXTEC AI for a preliminary estimate.',
      rules,
    });
  } catch (err) {
    console.error('[GET /api/pricing]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * GET /api/admin/pricing — admin only, includes inactive rules.
 */
router.get('/admin', requireAdminKey, async (req, res) => {
  const rules = await db.getAllPricingRules();
  res.json({ rules });
});

/**
 * PUT /api/admin/pricing/:id — admin only. Upserts one pricing rule.
 * This is how prices change WITHOUT touching code or redeploying.
 */
router.put('/admin/:id', requireAdminKey, requireFields(['service', 'feature', 'min_price', 'max_price']), async (req, res) => {
  try {
    const rule = {
      id: req.params.id,
      service: req.body.service,
      feature: req.body.feature,
      label_es: req.body.label_es || req.params.id,
      label_en: req.body.label_en || req.params.id,
      min_price: Number(req.body.min_price),
      max_price: Number(req.body.max_price),
      estimated_days_min: Number(req.body.estimated_days_min || 1),
      estimated_days_max: Number(req.body.estimated_days_max || 7),
      active: req.body.active !== false,
    };
    const saved = await db.upsertPricingRule(rule);
    await cache.del(PRICING_CACHE_KEY); // invalidate so /api/pricing reflects the edit immediately
    res.json({ rule: saved });
  } catch (err) {
    console.error('[PUT /api/admin/pricing/:id]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
