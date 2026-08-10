# Scaling

The app is not multi-instance today, but is built so it can become that
by changing environment variables — not code.

```
             Load Balancer / Cloud Run
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    Instance 1 Instance 2 Instance 3
        │         │         │
        └─────────┼─────────┘
                  ▼
               REDIS
                  ▼
             POSTGRESQL
```

## What already makes this possible

- **Stateless HTTP layer**: no in-process session state; every request
  carries what it needs (`conversation_id`, `x-admin-key`, etc.).
- **Shared cache/rate-limit state**: `src/services/cache.js` moves rate
  limiting and the pricing cache to Redis when `REDIS_URL` is set — so
  limits and cached data are consistent across instances instead of
  resetting per-instance.
- **Connection pooling**: Postgres access goes through a single pool per
  instance (`max: 5`); tune based on instance count × Postgres connection
  limit.
- **Pagination**: `GET /api/leads` is paginated (`limit`/`offset`) so the
  CRM view stays fast as lead volume grows.

## When to actually add more instances

Don't provision multiple instances "just in case" — Cloud Run already
autoscales on request volume if deployed there. Add fixed multi-instance
infrastructure only once real traffic data shows you need it (see
`/api/ready` + your platform's request/latency metrics).

## Next steps if traffic grows significantly

1. Move the local-JSON data store to Postgres (`DATABASE_URL`) — the
   JSON file store is not safe for concurrent writes at volume.
2. Add `REDIS_URL` so rate limiting and pricing cache are shared.
3. Put a CDN in front of static assets (widget JS/CSS, images, fonts) —
   see `nginx/nginx.conf` for the cache headers already configured for
   this, and `docs/deployment.md` for the Cloudflare option.
4. Revisit the Postgres pool size and consider PgBouncer if instance
   count × pool size approaches your Postgres plan's connection limit.
