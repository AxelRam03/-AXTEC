# Database

## Dual mode

All data access goes through `src/services/db.js` — no route or service
touches a JSON file or a SQL client directly. This is what makes the mode
switch a single environment variable:

| `DATABASE_URL` | Mode | Storage |
|---|---|---|
| unset | Local JSON | `src/data/*.json` |
| set | PostgreSQL | Cloud SQL / any Postgres instance |

## Schema

See `db/schema.sql` for the full DDL. Summary:

- **pricing_rules** — one row per (service, feature) price component.
  Edited via `/api/pricing/admin` (no redeploy needed).
- **conversations** — AI chat history + accumulated `project_data` per
  `conversation_id`, JSONB.
- **leads** — captured leads with CRM `status` (NEW → CONTACTED →
  QUALIFIED → QUOTE_SENT → NEGOTIATION → WON/LOST), estimate snapshot, and
  a `conversation_id` foreign key.
- **quote_requests** — formal quote requests, always `PENDING_REVIEW`
  until a human at AXTEC handles them.

Indexes: `leads(status)`, `leads(created_at)`, `quote_requests(lead_id)` —
covers the CRM list view and the pipeline-by-status queries.

## Applying the schema

```bash
psql "$DATABASE_URL" -f db/schema.sql
npm run seed   # loads starter pricing_rules
```

`db/schema.sql` uses `CREATE TABLE IF NOT EXISTS` — safe to re-run, never
drops or alters existing tables/columns. **No destructive migration is
included or should be run without a backup and manual review** (see
`scaling.md` / production checklist).

## Connection pooling

`src/services/db.js` creates a single `pg.Pool` (`max: 5`) at startup,
reused across all requests — connections are never opened per-request.
Tune `max` based on your Postgres plan's connection limit and expected
instance count (`instances × max` must stay under that limit).

## Queries

All queries are parameterized (`$1, $2, ...`) — no string concatenation
of user input into SQL anywhere. No ORM is used by design (the query set
is small and stable); if the schema grows significantly, revisit this.
