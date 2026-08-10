const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../services/db');
const email = require('../services/email');
const { requireFields, isValidEmail } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/contact
 * body: { name, company?, email, whatsapp?, service?, message, lang? }
 * Creates a lead with source CONTACT_FORM (for visitors who skip AXTEC AI
 * and use the plain contact form instead).
 */
router.post('/', requireFields(['name', 'email', 'message']), async (req, res) => {
  try {
    if (!isValidEmail(req.body.email)) {
      return res.status(400).json({ error: 'validation_error', message: 'Invalid email' });
    }
    const lang = req.body.lang === 'en' ? 'en' : 'es';

    const lead = {
      id: uuid(),
      name: String(req.body.name).slice(0, 200),
      company: req.body.company ? String(req.body.company).slice(0, 200) : null,
      email: req.body.email,
      phone: req.body.whatsapp ? String(req.body.whatsapp).slice(0, 40) : null,
      project_data: { project_type: req.body.service || null, message: String(req.body.message).slice(0, 2000) },
      estimated_price_min: null,
      estimated_price_max: null,
      estimated_days_min: null,
      estimated_days_max: null,
      conversation_id: null,
      source: 'CONTACT_FORM',
      status: 'NEW',
      lang,
      summary: String(req.body.message).slice(0, 500),
      created_at: new Date().toISOString(),
    };

    const saved = await db.createLead(lead);

    const isEs = lang !== 'en';
    await email.send({
      to: lead.email,
      subject: isEs ? 'Recibimos tu mensaje — AXTEC' : 'We received your message — AXTEC',
      text: isEs
        ? `Hola ${lead.name},\n\nGracias por escribirnos. Tu mensaje llegó correctamente y nuestro equipo te contactará pronto.\n\nAXTEC Technologies`
        : `Hi ${lead.name},\n\nThanks for reaching out. Your message came through and our team will contact you soon.\n\nAXTEC Technologies`,
    });
    await email.send({
      to: process.env.MAIL_INTERNAL_TO || 'leads@axtec.tech',
      subject: isEs ? 'Nuevo mensaje de contacto — AXTEC' : 'New contact message — AXTEC',
      text: `${lead.name} <${lead.email}> — ${lead.company || '-'}\n\n${lead.summary}`,
    });

    res.status(201).json({ lead: saved });
  } catch (err) {
    console.error('[POST /api/contact]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
