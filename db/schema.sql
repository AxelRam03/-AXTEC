-- =========================================================
-- AXTEC AI — PostgreSQL schema (Cloud SQL for production)
-- Run once against your database:
--   psql "$DATABASE_URL" -f db/schema.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id                  TEXT PRIMARY KEY,
  service             TEXT NOT NULL,
  feature             TEXT NOT NULL,
  label_es            TEXT NOT NULL,
  label_en            TEXT NOT NULL,
  min_price           NUMERIC(12,2) NOT NULL,
  max_price           NUMERIC(12,2) NOT NULL,
  estimated_days_min  INTEGER NOT NULL,
  estimated_days_max  INTEGER NOT NULL,
  active              BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  lang          TEXT NOT NULL DEFAULT 'es',
  messages      JSONB NOT NULL DEFAULT '[]',
  project_data  JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  company               TEXT,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  project_data          JSONB NOT NULL DEFAULT '{}',
  estimated_price_min   NUMERIC(12,2),
  estimated_price_max   NUMERIC(12,2),
  estimated_days_min    INTEGER,
  estimated_days_max    INTEGER,
  conversation_id       TEXT REFERENCES conversations(id),
  source                TEXT NOT NULL DEFAULT 'AXTEC_AI',
  status                TEXT NOT NULL DEFAULT 'NEW',
  lang                  TEXT NOT NULL DEFAULT 'es',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRM status values (enforced at the application layer):
-- NEW, CONTACTED, QUALIFIED, QUOTE_SENT, NEGOTIATION, WON, LOST

CREATE TABLE IF NOT EXISTS quote_requests (
  id                    TEXT PRIMARY KEY,
  lead_id               TEXT REFERENCES leads(id),
  project_data          JSONB NOT NULL DEFAULT '{}',
  estimated_price_min   NUMERIC(12,2),
  estimated_price_max   NUMERIC(12,2),
  status                TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_requests_lead_id ON quote_requests(lead_id);
