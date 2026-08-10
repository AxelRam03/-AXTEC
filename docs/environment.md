# Environment variables

See `.env.example` for the authoritative, always-up-to-date list with
inline comments. Summary:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `8080` | HTTP port |
| `NODE_ENV` | no | — | `production` enables HSTS header |
| `ALLOWED_ORIGINS` | yes (prod) | `*` | Comma-separated CORS allowlist |
| `ANTHROPIC_API_KEY` | no | — | Enables real AI conversations; without it, graceful fallback replies |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-4-5` | Model used by the AI provider |
| `DATABASE_URL` | no | — | Set to switch from local JSON to PostgreSQL |
| `REDIS_URL` | no | — | Set to switch rate limiting/cache from in-memory to Redis |
| `PRICING_CACHE_TTL_SECONDS` | no | `30` | How long `GET /api/pricing` responses are cached |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | no | — | Real email sending; without them, emails log to console |
| `MAIL_FROM` | no | `AXTEC Technologies <no-reply@axtec.tech>` | From header |
| `MAIL_INTERNAL_TO` | no | `leads@axtec.tech` | Where internal lead notifications go |
| `ADMIN_API_KEY` | yes (prod) | `change-me-please` | Required header for `/api/leads` (GET/PATCH) and `/api/pricing/admin*` |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate limit window |
| `RATE_LIMIT_MAX` | no | `60` | Max requests per window per IP |

Never commit real values — `.env` is gitignored. Only `.env.example`
(placeholders only) is tracked.
