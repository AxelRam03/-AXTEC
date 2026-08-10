/**
 * Security middleware.
 * -------------------------------------------------------------------------
 * Deliberately dependency-light (no helmet/express-rate-limit) so the
 * project runs with a minimal npm install. Swap for battle-tested
 * libraries before high-traffic production use if you prefer.
 * -------------------------------------------------------------------------
 */
const cache = require('../services/cache');

// ---- Security headers -----------------------------------------------
// CSP is intentionally permissive on connect-src/img-src (the widget can be
// embedded on the main AXTEC site and other client sites) but locked down
// on script-src/object-src/frame-ancestors. Adjust ALLOWED_ORIGINS-derived
// values if the widget starts loading third-party scripts.
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
    ].join('; ')
  );
  // Only meaningful over HTTPS (production); harmless over local HTTP dev.
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
}

// ---- Rate limiter (per IP) --------------------------------------------
// Backed by src/services/cache.js: in-memory by default, or a shared Redis
// counter when REDIS_URL is set — so limits hold across multiple instances
// (Cloud Run, load-balanced containers) instead of resetting per-instance.
async function rateLimit(req, res, next) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
  const max = Number(process.env.RATE_LIMIT_MAX || 60);
  const key = `ratelimit:${req.ip || 'unknown'}`;

  try {
    const count = await cache.incrWithWindow(key, windowMs);
    if (count > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please slow down.' });
    }
  } catch (err) {
    // Fail open: a broken rate limiter must never take the site down.
    console.error('[rateLimit]', err.message);
  }
  next();
}

// ---- Input sanitization helpers --------------------------------------
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeDeep(value, depth = 0) {
  if (depth > 6) return value;
  if (typeof value === 'string') return escapeHtml(value.slice(0, 4000));
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeDeep(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).slice(0, 50)) out[k] = sanitizeDeep(value[k], depth + 1);
    return out;
  }
  return value;
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body);
  }
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v) && v.length <= 254;
}

function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => {
      const v = req.body ? req.body[f] : undefined;
      return v === undefined || v === null || v === '';
    });
    if (missing.length) {
      return res.status(400).json({ error: 'validation_error', missing });
    }
    next();
  };
}

// ---- Admin auth (simple API key header) ------------------------------
function requireAdminKey(req, res, next) {
  const provided = req.header('x-admin-key');
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || provided !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

module.exports = {
  securityHeaders,
  rateLimit,
  sanitizeBody,
  isValidEmail,
  requireFields,
  requireAdminKey,
};
