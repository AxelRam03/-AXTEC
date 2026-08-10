/**
 * Data store abstraction.
 * -------------------------------------------------------------------------
 * Every route talks to THIS module, never to a file or a SQL client directly.
 * That's what lets AXTEC swap the local JSON store for Cloud SQL (Postgres)
 * in production by only setting DATABASE_URL — no route code changes.
 *
 * Local mode (default): reads/writes src/data/*.json. Good for development
 * and low volume. Not safe for concurrent writes at real production scale.
 *
 * Postgres mode: activated automatically when DATABASE_URL is set.
 * See db/schema.sql for the table definitions to run once against Cloud SQL.
 * -------------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const PRICING_FILE = path.join(DATA_DIR, 'pricing_rules.json');

const usingPostgres = Boolean(process.env.DATABASE_URL);

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------
// Postgres pool (only created if DATABASE_URL is present).
// Requires the optional "pg" dependency: npm install pg
// ---------------------------------------------------------------------
let pool = null;
if (usingPostgres) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
}

// ---------------------------------------------------------------------
// Pricing rules
// ---------------------------------------------------------------------
async function getPricingRules() {
  if (usingPostgres) {
    const { rows } = await pool.query('SELECT * FROM pricing_rules WHERE active = true');
    return rows;
  }
  return readJSON(PRICING_FILE, []).filter((r) => r.active !== false);
}

async function getAllPricingRules() {
  if (usingPostgres) {
    const { rows } = await pool.query('SELECT * FROM pricing_rules ORDER BY id');
    return rows;
  }
  return readJSON(PRICING_FILE, []);
}

async function upsertPricingRule(rule) {
  if (usingPostgres) {
    const cols = ['id', 'service', 'feature', 'label_es', 'label_en', 'min_price', 'max_price', 'estimated_days_min', 'estimated_days_max', 'active'];
    const values = cols.map((c) => rule[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(',');
    await pool.query(
      `INSERT INTO pricing_rules (${cols.join(',')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      values
    );
    return rule;
  }
  const all = readJSON(PRICING_FILE, []);
  const idx = all.findIndex((r) => r.id === rule.id);
  if (idx >= 0) all[idx] = { ...all[idx], ...rule };
  else all.push(rule);
  writeJSON(PRICING_FILE, all);
  return rule;
}

// ---------------------------------------------------------------------
// Conversations (in-memory context per conversation_id)
// ---------------------------------------------------------------------
async function getConversation(conversationId) {
  if (usingPostgres) {
    const { rows } = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
    return rows[0] || null;
  }
  const all = readJSON(CONVERSATIONS_FILE, {});
  return all[conversationId] || null;
}

async function saveConversation(conversationId, data) {
  if (usingPostgres) {
    await pool.query(
      `INSERT INTO conversations (id, lang, messages, project_data, updated_at)
       VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (id) DO UPDATE SET lang=$2, messages=$3, project_data=$4, updated_at=now()`,
      [conversationId, data.lang, JSON.stringify(data.messages), JSON.stringify(data.project_data)]
    );
    return;
  }
  const all = readJSON(CONVERSATIONS_FILE, {});
  all[conversationId] = { ...data, updated_at: new Date().toISOString() };
  writeJSON(CONVERSATIONS_FILE, all);
}

// ---------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------
async function createLead(lead) {
  if (usingPostgres) {
    const { rows } = await pool.query(
      `INSERT INTO leads (id, name, company, email, phone, project_data, estimated_price_min, estimated_price_max,
                           estimated_days_min, estimated_days_max, conversation_id, source, status, lang, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now()) RETURNING *`,
      [lead.id, lead.name, lead.company, lead.email, lead.phone, JSON.stringify(lead.project_data),
        lead.estimated_price_min, lead.estimated_price_max, lead.estimated_days_min, lead.estimated_days_max,
        lead.conversation_id, lead.source, lead.status, lead.lang]
    );
    return rows[0];
  }
  const all = readJSON(LEADS_FILE, []);
  all.push(lead);
  writeJSON(LEADS_FILE, all);
  return lead;
}

async function updateLeadStatus(leadId, status) {
  if (usingPostgres) {
    const { rows } = await pool.query('UPDATE leads SET status=$1 WHERE id=$2 RETURNING *', [status, leadId]);
    return rows[0];
  }
  const all = readJSON(LEADS_FILE, []);
  const lead = all.find((l) => l.id === leadId);
  if (lead) { lead.status = status; writeJSON(LEADS_FILE, all); }
  return lead;
}

/**
 * @param {Object} opts
 *   status?: string   — filter by CRM status
 *   limit?: number     — page size (default 50, max 200)
 *   offset?: number    — page offset (default 0)
 * @returns {Promise<{leads: Array, total: number}>}
 */
async function listLeads({ status, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  if (usingPostgres) {
    const where = status ? 'WHERE status = $1' : '';
    const params = status ? [status] : [];
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM leads ${where}`, params);
    const { rows } = await pool.query(
      `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, safeLimit, safeOffset]
    );
    return { leads: rows, total: countRows[0].total };
  }

  let all = readJSON(LEADS_FILE, []).slice().reverse();
  if (status) all = all.filter((l) => l.status === status);
  const total = all.length;
  const leads = all.slice(safeOffset, safeOffset + safeLimit);
  return { leads, total };
}

// ---------------------------------------------------------------------
// Quote requests (formal quote requests — still require human review)
// ---------------------------------------------------------------------
async function createQuoteRequest(quote) {
  if (usingPostgres) {
    const { rows } = await pool.query(
      `INSERT INTO quote_requests (id, lead_id, project_data, estimated_price_min, estimated_price_max, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, now()) RETURNING *`,
      [quote.id, quote.lead_id, JSON.stringify(quote.project_data), quote.estimated_price_min, quote.estimated_price_max, quote.status]
    );
    return rows[0];
  }
  const all = readJSON(QUOTES_FILE, []);
  all.push(quote);
  writeJSON(QUOTES_FILE, all);
  return quote;
}

module.exports = {
  usingPostgres,
  getPricingRules,
  getAllPricingRules,
  upsertPricingRule,
  getConversation,
  saveConversation,
  createLead,
  updateLeadStatus,
  listLeads,
  createQuoteRequest,
};
