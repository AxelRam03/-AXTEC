const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../services/db');
const email = require('../services/email');
const pricingEngine = require('../services/pricingEngine');
const { requireFields, isValidEmail, requireAdminKey } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/leads
 * body: {
 *   name, company?, email, phone?,
 *   project_data, conversation_id?, source?, lang?
 * }
 *
 * Creates a Lead (status NEW), computes/attaches the estimate if not
 * already known, saves the conversation summary, and fires both the
 * client confirmation email and the internal notification email.
 */
router.post('/', requireFields(['name', 'email']), async (req, res) => {
  try {
    if (!isValidEmail(req.body.email)) {
      return res.status(400).json({ error: 'validation_error', message: 'Invalid email' });
    }

    const lang = req.body.lang === 'en' ? 'en' : 'es';
    const projectData = req.body.project_data || {};
    const estimate = await pricingEngine.calculateEstimate(projectData);

    const lead = {
      id: uuid(),
      name: String(req.body.name).slice(0, 200),
      company: req.body.company ? String(req.body.company).slice(0, 200) : null,
      email: req.body.email,
      phone: req.body.phone ? String(req.body.phone).slice(0, 40) : null,
      project_data: projectData,
      estimated_price_min: estimate.min_price,
      estimated_price_max: estimate.max_price,
      estimated_days_min: estimate.estimated_days_min,
      estimated_days_max: estimate.estimated_days_max,
      conversation_id: req.body.conversation_id || null,
      source: req.body.source || 'AXTEC_AI',
      status: 'NEW',
      lang,
      summary: buildSummary(projectData, estimate, lang),
      created_at: new Date().toISOString(),
    };

    const saved = await db.createLead(lead);

    const clientMail = email.clientConfirmationEmail(lead, lang);
    const internalMail = email.internalNotificationEmail(lead, lang);

    await email.send({ to: lead.email, ...clientMail });
    await email.send({ to: process.env.MAIL_INTERNAL_TO || 'leads@axtec.tech', ...internalMail });

    res.status(201).json({ lead: saved, estimate });
  } catch (err) {
    console.error('[POST /api/leads]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * GET /api/leads — admin only, lists leads for the CRM view.
 * Query params: status?, limit? (default 50, max 200), offset? (default 0)
 */
router.get('/', requireAdminKey, async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const { leads, total } = await db.listLeads({ status, limit, offset });
    res.json({
      leads,
      pagination: {
        total,
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
      },
    });
  } catch (err) {
    console.error('[GET /api/leads]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * PATCH /api/leads/:id/status — admin only, moves a lead through the CRM pipeline.
 * Valid values: NEW, CONTACTED, QUALIFIED, QUOTE_SENT, NEGOTIATION, WON, LOST
 */
const VALID_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_SENT', 'NEGOTIATION', 'WON', 'LOST'];
router.patch('/:id/status', requireAdminKey, async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'validation_error', valid: VALID_STATUSES });
  }
  const updated = await db.updateLeadStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'not_found' });
  res.json({ lead: updated });
});

function buildSummary(p, estimate, lang) {
  const isEs = lang !== 'en';
  const lines = [];
  lines.push(isEs
    ? `Cliente interesado en un proyecto de tipo "${p.project_type || 'no especificado'}"${p.business_type ? ` (${p.business_type})` : ''}.`
    : `Client interested in a "${p.project_type || 'unspecified'}" project${p.business_type ? ` (${p.business_type})` : ''}.`);
  if (p.features && p.features.length) {
    lines.push(isEs ? `Requiere: ${p.features.join(', ')}.` : `Requires: ${p.features.join(', ')}.`);
  }
  if (estimate.min_price != null) {
    lines.push(isEs
      ? `Presupuesto estimado: $${estimate.min_price.toLocaleString()} – $${estimate.max_price.toLocaleString()} MXN.`
      : `Estimated budget: $${estimate.min_price.toLocaleString()} – $${estimate.max_price.toLocaleString()} MXN.`);
    lines.push(isEs
      ? `Tiempo: ${estimate.estimated_days_min} – ${estimate.estimated_days_max} días.`
      : `Time: ${estimate.estimated_days_min} – ${estimate.estimated_days_max} days.`);
  }
  return lines.join(' ');
}

module.exports = router;
