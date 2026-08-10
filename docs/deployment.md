# Deployment

Two supported paths. Pick one — don't run both against the same database.

## Option A — Google Cloud (Cloud Run + Cloud SQL), no Docker Compose needed

1. **Cloud SQL (Postgres)**: create an instance, run `db/schema.sql`
   against it, then `npm run seed` once.
2. **Memorystore (Redis)**, optional but recommended once you have more
   than one Cloud Run instance: create an instance, set `REDIS_URL`.
3. **Secret Manager**: store `ANTHROPIC_API_KEY`, `SMTP_PASS`,
   `ADMIN_API_KEY`, `DATABASE_URL`, `REDIS_URL` there — mount as env vars
   in Cloud Run, never commit them.
4. **Cloud Run**: build the included `Dockerfile` (`gcloud builds submit`
   or any CI), deploy, set `ALLOWED_ORIGINS` to your real domain(s) and
   `NODE_ENV=production`.
5. **Cloud Logging**: the app logs structured JSON to stdout already —
   Cloud Run picks this up automatically.
6. Put Cloudflare (or Cloud Armor) in front for CDN/WAF.

## Option B — self-hosted (Docker Compose)

For a single VM or local full-stack testing:

```bash
cp .env.example .env   # fill in real values
docker compose up -d --build
docker compose exec app node scripts/seed-pricing.js   # first run only
```

This starts `app` + `postgres` + `redis` + `nginx` (see
`docker-compose.yml` and `nginx/nginx.conf`). Put Cloudflare in front of
the host's port 80/443 for CDN/WAF, or terminate TLS at Nginx directly
with real certificates.

## Pre-flight checklist

- [ ] `ALLOWED_ORIGINS` set to real domain(s), not `*`
- [ ] `ADMIN_API_KEY` is a long random string, not the example default
- [ ] `NODE_ENV=production` (enables HSTS header)
- [ ] `.env` is not committed (check `.gitignore`)
- [ ] HTTPS is enforced end-to-end (Cloudflare/Nginx redirect HTTP→HTTPS)
- [ ] `db/schema.sql` applied and `npm run seed` run once
- [ ] `/api/ready` returns `200` before routing real traffic to an instance
- [ ] A recent Postgres backup exists before running any schema change
