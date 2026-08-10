require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { randomUUID } = require('crypto');

const { securityHeaders, rateLimit, sanitizeBody } = require('./src/middleware/security');
const db = require('./src/services/db');
const cache = require('./src/services/cache');

const aiChatRoute = require('./src/routes/aiChat');
const estimateRoute = require('./src/routes/estimate');
const leadsRoute = require('./src/routes/leads');
const quoteRoute = require('./src/routes/quote');
const pricingRoute = require('./src/routes/pricing');
const servicesRoute = require('./src/routes/services');
const contactRoute = require('./src/routes/contact');

const app = express();
const PORT = process.env.PORT || 8080;

// ---- Core middleware ---------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH'],
}));
app.use(express.json({ limit: '200kb' }));
app.use(securityHeaders);
app.use(rateLimit);
app.use(sanitizeBody);

// Structured request log with a request_id (swap for Cloud Logging in
// production — see README / docs/security.md). Never logs body/headers,
// so secrets, tokens and PII never end up in logs by accident.
app.use((req, res, next) => {
  req.request_id = req.header('x-request-id') || randomUUID();
  res.setHeader('x-request-id', req.request_id);
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      request_id: req.request_id,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      response_time_ms: Date.now() - start,
    }));
  });
  next();
});

// ---- Static demo frontend (the embeddable widget + a demo page) -------
app.use(express.static(path.join(__dirname, 'public')));

// ---- API routes ---------------------------------------------------------
app.use('/api/ai', aiChatRoute);
app.use('/api/estimate', estimateRoute);
app.use('/api/leads', leadsRoute);
app.use('/api/quote', quoteRoute);
app.use('/api/pricing', pricingRoute);
app.use('/api/services', servicesRoute);
app.use('/api/contact', contactRoute);

// Liveness: process is up and can respond. Used by container orchestrators
// to decide whether to restart the instance.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: process.env.DATABASE_URL ? 'postgres' : 'local-json',
    cache: cache.usingRedis ? 'redis' : 'in-memory',
  });
});

// Readiness: process is up AND its dependencies (DB, cache) actually
// respond. Used by load balancers to decide whether to route traffic here.
app.get('/api/ready', async (req, res) => {
  const checks = { database: true, cache: true };

  if (db.usingPostgres) {
    try {
      await db.getPricingRules();
    } catch (err) {
      checks.database = false;
    }
  }
  checks.cache = await cache.ping();

  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({ ready, checks });
});

// ---- 404 + error handling ------------------------------------------------
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ request_id: req.request_id, error: err.message, stack: err.stack }));
  // Never leak stack traces, SQL errors or internal paths to the client.
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado / An unexpected error occurred' },
  });
});

app.listen(PORT, () => {
  console.log(`AXTEC AI backend listening on http://localhost:${PORT}`);
  console.log(`Data store: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'local JSON files (src/data)'}`);
  console.log(`AI provider: ${process.env.ANTHROPIC_API_KEY ? 'Anthropic (live)' : 'FALLBACK MODE — set ANTHROPIC_API_KEY to enable real conversations'}`);
});
