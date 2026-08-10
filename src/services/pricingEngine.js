/**
 * Pricing engine.
 * -------------------------------------------------------------------------
 * This is the ONLY place a price is calculated. The AI never invents a
 * number — it only produces structured project_data, which is passed in
 * here. This module reads pricing_rules (editable via /api/admin/pricing,
 * no code changes needed) and returns a min/max range, a day range and a
 * complexity tier.
 * -------------------------------------------------------------------------
 */
const db = require('./db');

const TIER_THRESHOLDS = {
  STARTER_MAX: 10000,   // total max_price at or below this => Starter
  BUSINESS_MAX: 25000,  // total max_price at or below this => Business, above => Custom
};

/**
 * @param {Object} projectData
 *   project_type: 'web' | 'ecommerce' | 'software' | 'automation' | 'ai' | 'cloud'
 *   features: string[] — feature keys matching pricing_rules[].feature
 * @returns {Promise<Object>} estimate
 */
async function calculateEstimate(projectData) {
  const rules = await db.getPricingRules();
  const projectType = (projectData.project_type || '').toLowerCase();
  const features = new Set((projectData.features || []).map((f) => String(f).toLowerCase()));

  const matched = rules.filter((r) => {
    if (r.service !== projectType) return false;
    return r.feature === 'base' || features.has(r.feature);
  });

  if (matched.length === 0) {
    return {
      matched_rules: [],
      min_price: null,
      max_price: null,
      estimated_days_min: null,
      estimated_days_max: null,
      complexity: null,
      currency: 'MXN',
      note: 'not_enough_data',
    };
  }

  const min_price = matched.reduce((sum, r) => sum + Number(r.min_price), 0);
  const max_price = matched.reduce((sum, r) => sum + Number(r.max_price), 0);
  const estimated_days_min = matched.reduce((sum, r) => sum + Number(r.estimated_days_min), 0);
  const estimated_days_max = matched.reduce((sum, r) => sum + Number(r.estimated_days_max), 0);

  let complexity = 'Starter';
  if (max_price > TIER_THRESHOLDS.BUSINESS_MAX) complexity = 'Custom';
  else if (max_price > TIER_THRESHOLDS.STARTER_MAX) complexity = 'Business';

  return {
    matched_rules: matched.map((r) => ({ id: r.id, label_es: r.label_es, label_en: r.label_en })),
    min_price,
    max_price,
    estimated_days_min,
    estimated_days_max,
    complexity,
    currency: 'MXN',
    note: 'preliminary_estimate',
  };
}

module.exports = { calculateEstimate, TIER_THRESHOLDS };
