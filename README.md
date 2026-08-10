# AXTEC  — commercial chatbot + smart quoting engine

Bilingual (ES/EN) backend + embeddable widget for AXTEC Technologies. Real
conversation via the Anthropic API, a deterministic pricing engine the AI
never touches, lead capture with CRM statuses, and automatic email — with
safe fallbacks everywhere so the site never breaks if something upstream
(AI, email, DB) is unavailable.

---

## English

### What this is

- **Backend**: Node.js + Express. Structured API (`/api/ai/chat`, `/api/estimate`,
  `/api/leads`, `/api/quote`, `/api/pricing`, `/api/services`, `/api/contact`).
- **AI**: calls the Anthropic Messages API. The model interprets language and
  returns *structured project data* — it never sets a price, never writes to
  the database, never sends an email. Those are backend responsibilities.
- **Pricing engine**: reads `src/data/pricing_rules.json` (or the `pricing_rules`
  Postgres table in production) and computes a price range, a day range and a
  complexity tier (Starter / Business / Custom). Editable via `/api/admin/pricing`
  — no code changes or redeploys needed to change a price.
- **Data store**: local JSON files by default (`src/data/*.json`) — zero setup,
  good for development. Set `DATABASE_URL` to switch automatically to
  PostgreSQL (Cloud SQL in production) — see `db/schema.sql`.
- **Email**: Nodemailer over SMTP. If SMTP isn't configured, emails are logged
  to the console instead of failing — local dev keeps working.
- **Frontend widget**: `public/axtec-ai-widget.js` + `.css` — a small,
  dependency-free script you drop into any page (including the existing AXTEC
  site). It only talks to this backend's public API.

The example prices in `pricing_rules.json` are **illustrative**, not AXTEC's
real official rates — edit them (via the admin page or directly in the JSON)
before going live.

### Running it locally

```bash
npm install
cp .env.example .env
# edit .env: at minimum set ANTHROPIC_API_KEY to get real conversations
# (without it, the API still runs — AXTEC AI replies with a graceful
# "not available right now" fallback so the rest of the site keeps working)
npm start
```

Open `http://localhost:8080` — a demo page mounts the widget against this
backend. Check `http://localhost:8080/api/health` to see whether you're in
local-JSON or Postgres mode, and whether the AI key is configured.

### Embedding on the real AXTEC site

Copy `public/axtec-ai-widget.js` and `public/axtec-ai-widget.css` next to your
site's other assets, then add:

```html
<link rel="stylesheet" href="/axtec-ai-widget.css">
<script src="/axtec-ai-widget.js" defer
        data-api-base="https://your-backend.example.com"
        data-whatsapp="52XXXXXXXXXX"></script>
```

`data-api-base` should point at wherever you deploy this backend (see below).
If the widget is served from the same origin as the backend, you can omit it.

### API summary

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/ai/chat` | POST | Main conversation loop. Body: `{conversation_id?, message, lang?}` |
| `/api/estimate` | POST | Pure pricing calculation. Body: `{project_type, features[]}` |
| `/api/leads` | POST | Creates a Lead + sends confirmation/internal emails |
| `/api/leads` | GET (admin) | Lists leads for the CRM view |
| `/api/leads/:id/status` | PATCH (admin) | Moves a lead through the pipeline |
| `/api/quote` | POST | Registers a formal quote request (status `PENDING_REVIEW`) |
| `/api/pricing` | GET | Public, read-only pricing rules |
| `/api/pricing/admin` | GET/PUT (admin) | Manage pricing without touching code |
| `/api/services` | GET | Services, process and FAQ, bilingual |
| `/api/contact` | POST | Plain contact form → also creates a lead |

Admin routes require header `x-admin-key: <ADMIN_API_KEY>`.

### Architecture — why the AI never sets a price

```
USER → AI (interprets intent, asks questions) → structured project_data
     → BACKEND → PRICE ENGINE (pricing_rules.json / Postgres) → RESULT
     → AI explains the result in natural language
```

This separation exists so pricing stays consistent, auditable and instantly
editable — a hallucinated number from the model can never reach a visitor.

### Deploying to Google Cloud (Cloud Run + Cloud SQL)

1. **Cloud SQL (Postgres)**: create an instance, then run `db/schema.sql`
   against it (`psql "$DATABASE_URL" -f db/schema.sql`), then `npm run seed`
   once to load the starter pricing rules.
2. **Secret Manager**: store `ANTHROPIC_API_KEY`, `SMTP_PASS`, `ADMIN_API_KEY`
   there — never in code or in a committed `.env`. Mount them as environment
   variables in Cloud Run.
3. **Cloud Run**: containerize with a minimal `Dockerfile` (Node 18+, `npm ci`,
   `npm start`), set `DATABASE_URL` to the Cloud SQL connection string (via the
   Cloud SQL Auth Proxy sidecar or Unix socket), set `ALLOWED_ORIGINS` to your
   real domain(s).
4. **Cloud Logging / Monitoring**: the app logs to stdout/stderr already —
   Cloud Run picks this up automatically as Cloud Logging.

### Security notes

- No secrets are hardcoded anywhere — everything sensitive comes from
  environment variables (`.env` locally, Secret Manager in production).
- Basic rate limiting, input sanitization and security headers are built in
  (`src/middleware/security.js`). For high-traffic production, swap the
  in-memory rate limiter for a shared store (Redis/Memorystore).
- Admin endpoints require `x-admin-key`; rotate `ADMIN_API_KEY` periodically.
- CORS is restricted to `ALLOWED_ORIGINS` — set this to your real domain(s)
  before going live.

---

## Español

### Qué es esto

- **Backend**: Node.js + Express. API estructurada (`/api/ai/chat`,
  `/api/estimate`, `/api/leads`, `/api/quote`, `/api/pricing`, `/api/services`,
  `/api/contact`).
- **IA**: llama a la API de Anthropic. El modelo interpreta el lenguaje y
  devuelve *datos estructurados del proyecto* — nunca fija un precio, nunca
  escribe en la base de datos, nunca envía un correo. Eso lo hace el backend.
- **Motor de precios**: lee `src/data/pricing_rules.json` (o la tabla
  `pricing_rules` en Postgres en producción) y calcula un rango de precio, un
  rango de días y un nivel de complejidad (Starter / Business / Custom). Se
  edita desde `/api/admin/pricing` — sin tocar código ni volver a desplegar.
- **Base de datos**: archivos JSON locales por defecto (`src/data/*.json`) —
  cero configuración, ideal para desarrollo. Define `DATABASE_URL` para pasar
  automáticamente a PostgreSQL (Cloud SQL en producción) — ver `db/schema.sql`.
- **Correo**: Nodemailer sobre SMTP. Si no hay SMTP configurado, los correos se
  muestran en la consola en vez de fallar — el entorno local sigue funcionando.
- **Widget de frontend**: `public/axtec-ai-widget.js` + `.css` — un script
  ligero, sin dependencias, que se agrega a cualquier página (incluido el
  sitio de AXTEC ya existente). Solo habla con la API pública de este backend.

Los precios de ejemplo en `pricing_rules.json` son **ilustrativos**, no son
las tarifas oficiales reales de AXTEC — edítalos (desde la página de admin o
directamente en el JSON) antes de salir a producción.

### Cómo correrlo en local

```bash
npm install
cp .env.example .env
# edita .env: como mínimo define ANTHROPIC_API_KEY para tener conversaciones reales
# (sin ella, la API sigue funcionando — AXTEC AI responde con un mensaje de
# "no disponible por ahora" en vez de fallar, así el resto del sitio sigue vivo)
npm start
```

Abre `http://localhost:8080` — una página de demo monta el widget contra este
backend. Revisa `http://localhost:8080/api/health` para ver si estás en modo
JSON local o Postgres, y si la clave de IA está configurada.

### Integrarlo en el sitio real de AXTEC

Copia `public/axtec-ai-widget.js` y `public/axtec-ai-widget.css` junto a los
demás archivos del sitio y agrega:

```html
<link rel="stylesheet" href="/axtec-ai-widget.css">
<script src="/axtec-ai-widget.js" defer
        data-api-base="https://tu-backend.ejemplo.com"
        data-whatsapp="52XXXXXXXXXX"></script>
```

`data-api-base` debe apuntar a donde despliegues este backend (ver abajo). Si
el widget se sirve desde el mismo origen que el backend, puedes omitirlo.

### Por qué la IA nunca calcula el precio

```
USUARIO → IA (interpreta la intención, pregunta) → project_data estructurado
        → BACKEND → MOTOR DE PRECIOS (pricing_rules.json / Postgres) → RESULTADO
        → LA IA explica el resultado en lenguaje natural
```

Esta separación existe para que el precio se mantenga consistente, auditable
e inmediatamente editable — un número inventado por el modelo nunca puede
llegarle a un visitante.

### Desplegar en Google Cloud (Cloud Run + Cloud SQL)

1. **Cloud SQL (Postgres)**: crea una instancia, corre `db/schema.sql`
   contra ella (`psql "$DATABASE_URL" -f db/schema.sql`), y ejecuta
   `npm run seed` una vez para cargar los precios iniciales.
2. **Secret Manager**: guarda ahí `ANTHROPIC_API_KEY`, `SMTP_PASS` y
   `ADMIN_API_KEY` — nunca en código ni en un `.env` versionado. Móntalos como
   variables de entorno en Cloud Run.
3. **Cloud Run**: crea un `Dockerfile` mínimo (Node 18+, `npm ci`, `npm start`),
   define `DATABASE_URL` con la cadena de conexión a Cloud SQL (vía el Cloud
   SQL Auth Proxy o socket Unix), y `ALLOWED_ORIGINS` con tu(s) dominio(s) real(es).
4. **Cloud Logging / Monitoring**: la app ya loguea a stdout/stderr — Cloud Run
   lo captura automáticamente como Cloud Logging.

### Notas de seguridad

- No hay ningún secreto escrito en el código — todo lo sensible viene de
  variables de entorno (`.env` en local, Secret Manager en producción).
- Incluye rate limiting básico, sanitización de entradas y headers de
  seguridad (`src/middleware/security.js`). Para producción con tráfico alto,
  reemplaza el rate limiter en memoria por uno compartido (Redis/Memorystore).
- Los endpoints de admin requieren `x-admin-key`; rota `ADMIN_API_KEY`
  periódicamente.
- CORS está restringido a `ALLOWED_ORIGINS` — configúralo con tu(s) dominio(s)
  real(es) antes de salir a producción.
