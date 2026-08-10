const express = require('express');
const knowledge = require('../config/knowledge');

const router = express.Router();

/**
 * GET /api/services?lang=es|en
 */
router.get('/', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'es';
  res.json({
    company: knowledge.company,
    services: knowledge.services[lang],
    process: knowledge.process[lang],
    faq: knowledge.faq[lang],
  });
});

module.exports = router;
