# Architecture

## Request path (production)

```
                         INTERNET
                            │
                            ▼
                  CLOUDFLARE (CDN / WAF)
                            │
                            ▼
                     NGINX (reverse proxy,
                      gzip, static caching,
                      TLS termination if not
                      already done by Cloudflare)
                            │
                            ▼
                    NODE / EXPRESS APP
                    (stateless, horizontally
                     scalable — see scaling.md)
                            │
                ┌───────────┼───────────┐
                ▼                       ▼
             REDIS                 POSTGRESQL
       (rate limiting,           (leads, quotes,
        pricing cache)          conversations, pricing_rules)
```

In local development, Redis and Postgres are both optional: unset
`DATABASE_URL` and `REDIS_URL` and the app runs entirely on local JSON
files (`src/data/*.json`) and in-memory state. This is intentional — the
whole point of the dual-mode design is zero-setup local dev with a
one-env-var upgrade path to production infrastructure.

## Layers

```
routes/        HTTP concerns only: parse request, call a service, shape
                the response. No business logic, no direct DB/file access.
services/      Business logic + data access (db.js, cache.js, aiProvider.js,
                pricingEngine.js, email.js). Routes never bypass this layer.
middleware/    Cross-cutting concerns: security headers, rate limiting,
                sanitization, admin auth.
config/        Static knowledge base the AI is allowed to state as fact.
```

## Why the AI never sets a price

```
USER → AI (interprets intent, asks questions) → structured project_data
     → BACKEND → PRICE ENGINE (pricing_rules.json / Postgres) → RESULT
     → AI explains the result in natural language
```

This separation exists so pricing stays consistent, auditable and
instantly editable — a hallucinated number from the model can never reach
a visitor. See `src/services/pricingEngine.js` and
`src/services/aiProvider.js`.

## Frontend

The existing AXTEC site (`index.html`, current design/UI/animations) is
untouched. The AI widget (`public/axtec-ai-widget.js` + `.css`) is a
separate, dependency-free script that only talks to this backend's public
API — it can be embedded on the real site without any framework
dependency or rebuild step.
