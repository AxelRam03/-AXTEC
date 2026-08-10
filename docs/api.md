# API reference

Base path: `/api`. All responses are JSON. Admin routes require header
`x-admin-key: <ADMIN_API_KEY>`.

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/health` | GET | none | Liveness — process is up |
| `/api/ready` | GET | none | Readiness — DB + cache actually respond |
| `/api/ai/chat` | POST | none | Main conversation loop |
| `/api/estimate` | POST | none | Pure pricing calculation |
| `/api/leads` | POST | none | Create a lead (sends confirmation + internal email) |
| `/api/leads` | GET | admin | List leads, paginated (`?status=&limit=&offset=`) |
| `/api/leads/:id/status` | PATCH | admin | Move a lead through the CRM pipeline |
| `/api/quote` | POST | none | Register a formal quote request |
| `/api/pricing` | GET | none | Public pricing rules (cached ~30s) |
| `/api/pricing/admin` | GET | admin | All pricing rules, including inactive |
| `/api/pricing/admin/:id` | PUT | admin | Upsert one pricing rule |
| `/api/services` | GET | none | Services, process, FAQ (`?lang=es\|en`) |
| `/api/contact` | POST | none | Plain contact form → creates a lead |

## `POST /api/ai/chat`

```json
// request
{ "conversation_id": "optional-uuid", "message": "string", "lang": "es|en" }

// response
{
  "conversation_id": "uuid",
  "reply": "string",
  "intent": "WEB|ECOMMERCE|SOFTWARE|AUTOMATION|AI|CLOUD|...",
  "project_data": { "project_type": "...", "features": ["..."] },
  "ready_for_estimate": true,
  "estimate": { "min_price": 9000, "max_price": 16000, "...": "..." },
  "degraded": false
}
```

`degraded: true` means the AI provider was unavailable and a fallback
reply was used — the rest of the flow keeps working.

## `GET /api/leads` (admin, paginated)

```
GET /api/leads?status=NEW&limit=50&offset=0
x-admin-key: <ADMIN_API_KEY>
```

```json
{ "leads": [ ... ], "pagination": { "total": 132, "limit": 50, "offset": 0 } }
```

## Error shape

Every non-2xx response follows this shape (never a stack trace, SQL
error, or internal path):

```json
{ "error": "validation_error", "missing": ["email"] }
```

or, for uncaught errors:

```json
{ "success": false, "error": { "code": "INTERNAL_ERROR", "message": "..." } }
```

## Rate limiting

Configurable via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` (default 60
requests/minute per IP). Backed by Redis when `REDIS_URL` is set, so the
limit holds across multiple instances; otherwise in-memory per instance.
A `429` includes a `Retry-After` header.
