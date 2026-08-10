# Security

OWASP-Top-10-oriented notes on what's implemented and why.

| Risk | Mitigation |
|---|---|
| SQL Injection | All Postgres queries are parameterized (`$1, $2...`); no string concatenation of user input into SQL. |
| XSS | `src/middleware/security.js` HTML-escapes all string fields in request bodies recursively (`sanitizeBody`), and a strict `Content-Security-Policy` header restricts script sources. |
| CSRF | The API is stateless / token-header based (no cookies), which removes the classic CSRF vector. If cookie-based auth is added later, add CSRF tokens then. |
| CORS | Restricted to `ALLOWED_ORIGINS`; never `*` for any deployment serving real user data — set your real domain(s) before going live. |
| IDOR | Lead/quote IDs are UUIDs (non-guessable); admin routes require `x-admin-key` regardless of ID. |
| Broken Access Control | All authorization checks (`requireAdminKey`) happen server-side; the frontend never gates access to data, only UI. |
| Rate limiting / abuse | Per-IP rate limiter (`RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`), shared via Redis when `REDIS_URL` is set. |
| Secrets in frontend | Nothing sensitive (`DATABASE_URL`, `ANTHROPIC_API_KEY`, `ADMIN_API_KEY`, `SMTP_PASS`) is ever sent to the browser — only public data crosses `/api/*` responses. |
| DevTools / "Inspect Element" | Not treated as a security boundary. Anyone can view frontend HTML/CSS/JS/network requests — that's expected and fine, because nothing sensitive is placed there in the first place. |
| Error leakage | Production error responses never include stack traces, SQL errors, internal paths, or env vars — see the error handler in `server.js`. |
| Logging | Structured JSON logs include `request_id`, timestamp, method, path, status, response time. Never logs passwords, tokens, API keys, or request bodies. |

## Headers set on every response

`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Content-Security-Policy`, and (in `NODE_ENV=production`)
`Strict-Transport-Security`.

## Secrets

- Never hardcoded — everything comes from environment variables (`.env`
  locally, Secret Manager in production).
- `.env` is gitignored at the repo root; only `.env.example` (no real
  values) is committed.
- Rotate `ADMIN_API_KEY` periodically; it's the only credential gating
  the CRM/pricing admin endpoints.

## What's intentionally out of scope here

- End-user authentication/authorization (there are no end-user accounts
  in this project — only an admin API key). If user accounts are added,
  use Argon2id for password hashing and follow the same "never trust the
  frontend" rule for every authorization check.
- A WAF/bot-mitigation layer — this app is built to sit behind
  Cloudflare or an equivalent; it does not attempt to reimplement that.
