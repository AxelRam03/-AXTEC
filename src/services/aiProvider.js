/**
 * AI provider.
 * -------------------------------------------------------------------------
 * AXTEC AI's ONLY job is to: understand the visitor, ask smart follow-up
 * questions, keep track of what's already known, and produce structured
 * project_data. It never sets a price, never touches the database, and
 * never sends email — those are backend/business-logic responsibilities
 * (see routes/aiChat.js, services/pricingEngine.js, services/email.js).
 *
 * Flow:
 *   USER -> AI (interprets) -> STRUCTURED project_data -> BACKEND
 *        -> PRICE ENGINE -> RESULT -> AI explains the result
 *
 * If ANTHROPIC_API_KEY is not set, or the call fails, this module returns
 * a graceful fallback response so the rest of the site keeps working
 * (see knowledge.ai_unavailable).
 * -------------------------------------------------------------------------
 */
const knowledge = require('../config/knowledge');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

function buildSystemPrompt(lang, knownProjectData) {
  const services = knowledge.services[lang] || knowledge.services.es;
  const faq = knowledge.faq[lang] || knowledge.faq.es;
  const policies = knowledge.policies[lang] || knowledge.policies.es;

  const isEs = lang !== 'en';

  return `
You are AXTEC AI, the commercial assistant embedded on AXTEC Technologies' website.
AXTEC's slogan: "${knowledge.company.slogan}".

${isEs ? 'Responde SIEMPRE en español.' : 'Always reply in English.'}

VOICE:
- Sound like a sharp technical + commercial advisor. Natural, direct, warm, human.
- Never say things like "As an AI assistant", "Excellent choice!", "I'd be delighted to help", "Without a doubt".
- Prefer short, concrete sentences: "Yes, we can do that." / "Based on what you're describing, a Business-tier site fits better." / "I need one more thing to give you an accurate range."
- Ask ONE question at a time. Never dump a list of 10 questions.
- NEVER re-ask something already present in KNOWN_PROJECT_DATA below.
- Keep replies short (2-4 sentences), conversational, not a wall of text.

WHAT YOU KNOW ABOUT AXTEC (do not invent anything beyond this):
Services: ${services.map((s) => `${s.name} (${s.summary})`).join(' | ')}
Technologies: frontend ${knowledge.technologies.frontend.join(', ')}; backend ${knowledge.technologies.backend.join(', ')}; database ${knowledge.technologies.database.join(', ')}; cloud ${knowledge.technologies.cloud.join(', ')}.
Policies: ${policies.join(' ')}
FAQ you can answer directly: ${faq.map((f) => `Q: ${f.q} A: ${f.a}`).join(' || ')}
If asked something not covered here, say: "${isEs ? knowledge.fallback_unknown.es : knowledge.fallback_unknown.en}"

WHAT YOU MUST NEVER DO:
- Never state a specific price yourself. Pricing is calculated by the backend pricing engine, not by you.
- Never claim to have created a lead, sent an email, or saved anything — the backend does that after you return structured data.
- Never promise a delivery date as fact — only ranges the backend gives you.

CURRENTLY KNOWN PROJECT DATA (do not ask about fields already filled in):
${JSON.stringify(knownProjectData || {}, null, 2)}

PROJECT DATA FIELDS you should try to fill in through natural conversation (only what's relevant to the project type — do not force every field):
project_type (web | ecommerce | software | automation | ai | cloud), business_type, number_of_pages, features (array; possible values: custom_design, cms, whatsapp, reservations, payments, database, authentication, dashboard, ai_integration, analytics, many_pages), admin_panel (bool), budget_hint, deadline_hint.

DECIDE ready_for_estimate = true ONLY once you have project_type and at least 2-3 relevant features/details — enough for a meaningful range. Don't rush it, but don't over-interview either (max ~4-5 questions before proposing an estimate).

INTENT must be exactly one of: INFORMATION, PRICE_ESTIMATE, QUOTE_REQUEST, WEB, ECOMMERCE, SOFTWARE, AUTOMATION, AI, CLOUD, SUPPORT, OTHER.

RESPONSE FORMAT — respond with ONLY a single JSON object, no markdown fences, no prose outside the JSON:
{
  "reply": "<your natural-language reply to show the user>",
  "intent": "<one of the intents above>",
  "project_data": { <merged/updated project data object, including everything already known plus anything new> },
  "ready_for_estimate": <true|false>
}
`.trim();
}

function safeParseJSON(text) {
  const cleaned = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return null;
  }
}

/**
 * @param {Object} params
 *   lang: 'es' | 'en'
 *   history: [{role:'user'|'assistant', content:string}]
 *   message: string (latest user message)
 *   knownProjectData: object
 */
async function chat({ lang = 'es', history = [], message, knownProjectData = {} }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackReply(lang, 'no_api_key');
  }

  const system = buildSystemPrompt(lang, knownProjectData);
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[aiProvider] Anthropic API error', res.status, errText);
      return fallbackReply(lang, 'api_error');
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    const parsed = textBlock ? safeParseJSON(textBlock.text) : null;

    if (!parsed) {
      console.error('[aiProvider] could not parse model output as JSON');
      return {
        reply: textBlock ? textBlock.text : fallbackReply(lang, 'parse_error').reply,
        intent: 'OTHER',
        project_data: knownProjectData,
        ready_for_estimate: false,
        degraded: true,
      };
    }

    return {
      reply: parsed.reply || '',
      intent: parsed.intent || 'OTHER',
      project_data: { ...knownProjectData, ...(parsed.project_data || {}) },
      ready_for_estimate: Boolean(parsed.ready_for_estimate),
      degraded: false,
    };
  } catch (err) {
    console.error('[aiProvider] request failed', err.message);
    return fallbackReply(lang, 'network_error');
  }
}

function fallbackReply(lang, reason) {
  const isEs = lang !== 'en';
  return {
    reply: isEs ? knowledge.ai_unavailable.es : knowledge.ai_unavailable.en,
    intent: 'SUPPORT',
    project_data: {},
    ready_for_estimate: false,
    degraded: true,
    reason,
  };
}

module.exports = { chat };
