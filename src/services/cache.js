/**
 * Cache / shared-state layer.
 * -------------------------------------------------------------------------
 * Used for: rate limiting counters and short-lived response caching
 * (e.g. GET /api/pricing). Mirrors the dual-mode pattern of db.js:
 *
 *   - No REDIS_URL  -> in-memory Map. Fine for a single instance / dev.
 *   - REDIS_URL set -> ioredis client, so state is shared across every
 *     Cloud Run / container instance behind a load balancer.
 *
 * Every caller goes through this module — never touch a Map or a Redis
 * client directly outside of here, so swapping backends stays a one-line
 * env var change (same rule as the database layer).
 *
 * Requires the optional "ioredis" dependency only when REDIS_URL is set:
 *   npm install ioredis
 * -------------------------------------------------------------------------
 */

const usingRedis = Boolean(process.env.REDIS_URL);

let redis = null;
if (usingRedis) {
  const Redis = require('ioredis');
  redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
  });
  redis.on('error', (err) => {
    // Never crash the app because the cache is unavailable — caching and
    // rate limiting degrade gracefully, they must not take the site down.
    console.error('[cache] Redis error (falling back to allow-through behavior):', err.message);
  });
}

// ---------------------------------------------------------------------
// In-memory fallback store (used when Redis isn't configured)
// ---------------------------------------------------------------------
const memoryStore = new Map();

function memoryGet(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key, value, ttlSeconds) {
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

// ---------------------------------------------------------------------
// Generic get/set (JSON-serialized values), used for response caching
// ---------------------------------------------------------------------
async function get(key) {
  if (usingRedis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('[cache.get]', err.message);
      return null;
    }
  }
  return memoryGet(key);
}

async function set(key, value, ttlSeconds = 60) {
  if (usingRedis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch (err) {
      console.error('[cache.set]', err.message);
      return;
    }
  }
  memorySet(key, value, ttlSeconds);
}

async function del(key) {
  if (usingRedis) {
    try {
      await redis.del(key);
      return;
    } catch (err) {
      console.error('[cache.del]', err.message);
      return;
    }
  }
  memoryStore.delete(key);
}

// ---------------------------------------------------------------------
// Fixed-window counter, used by the rate limiter.
// Returns the count AFTER incrementing, for the current window.
// ---------------------------------------------------------------------
async function incrWithWindow(key, windowMs) {
  if (usingRedis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      return count;
    } catch (err) {
      console.error('[cache.incrWithWindow]', err.message);
      // Fail open: if Redis is down, don't block traffic.
      return 1;
    }
  }

  const now = Date.now();
  const bucket = memoryStore.get(key);
  if (!bucket || !bucket.expiresAt || bucket.expiresAt < now) {
    memoryStore.set(key, { value: 1, expiresAt: now + windowMs });
    return 1;
  }
  bucket.value += 1;
  return bucket.value;
}

async function ping() {
  if (!usingRedis) return true;
  try {
    await redis.ping();
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { usingRedis, get, set, del, incrWithWindow, ping };
