const express = require('express');
const { v4: uuid } = require('uuid');
const aiProvider = require('../services/aiProvider');
const pricingEngine = require('../services/pricingEngine');
const db = require('../services/db');
const { requireFields } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/ai/chat
 * body: { conversation_id?, message, lang? }
 *
 * Returns: { conversation_id, reply, intent, project_data, ready_for_estimate, estimate? }
 *
 * Flow (see aiProvider.js header comment):
 *   USER -> AI -> structured project_data -> BACKEND -> PRICE ENGINE -> RESULT -> AI explains it
 * The estimate itself is always computed here, by pricingEngine — never by the model.
 */
router.post('/chat', requireFields(['message']), async (req, res) => {
  try {
    const lang = req.body.lang === 'en' ? 'en' : 'es';
    const conversationId = req.body.conversation_id || uuid();
    const message = String(req.body.message).slice(0, 2000);

    let convo = await db.getConversation(conversationId);
    if (!convo) convo = { lang, messages: [], project_data: {} };

    const history = convo.messages || [];

    const aiResult = await aiProvider.chat({
      lang,
      history,
      message,
      knownProjectData: convo.project_data || {},
    });

    const updatedMessages = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: aiResult.reply },
    ].slice(-30); // keep last 30 turns to bound memory/token usage

    const updatedProjectData = { ...(convo.project_data || {}), ...(aiResult.project_data || {}) };

    let estimate = null;
    if (aiResult.ready_for_estimate) {
      estimate = await pricingEngine.calculateEstimate(updatedProjectData);
    }

    await db.saveConversation(conversationId, {
      lang,
      messages: updatedMessages,
      project_data: updatedProjectData,
    });

    res.json({
      conversation_id: conversationId,
      reply: aiResult.reply,
      intent: aiResult.intent,
      project_data: updatedProjectData,
      ready_for_estimate: Boolean(aiResult.ready_for_estimate),
      estimate,
      degraded: Boolean(aiResult.degraded),
    });
  } catch (err) {
    console.error('[POST /api/ai/chat]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
