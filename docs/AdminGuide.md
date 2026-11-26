# MMS — Admin Guide

For Strategic Planner & Analysis (SPA), MD, CBDO, and anyone responsible for running the platform.

## Roles & permissions

RBAC is enforced on the API. Tiers (higher passes lower gates):

| Tier | Roles | API gates |
|---|---|---|
| moderator | MD, CBDO | `requireTier("admin")` + everything |
| admin | SPA | `requireTier("admin")` |
| editor | Brand Custodian, SBU Head | `requireRole("SPA","BRAND_CUSTODIAN","SBU_HEAD")` for uploads/decisions |
| functional | Finance, Research, 8 functional roles | domain-scoped (their own function) |
| viewer | Viewer | `requireAuth()` only (read) |

**How to assign a role:** insert a row in `user` (email) and link to `role` via `user_role`:

```sql
-- user is auto-created on first sign-in; then:
INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id FROM "user" u, "role" r
WHERE u.email = 'person@akijresource.com' AND r.code = 'SPA';
```

The seeded roles: `MD`, `CBDO`, `SPA`, `BRAND_CUSTODIAN`, `SBU_HEAD`, `FINANCE`, `RESEARCH`, `OOH_ACTIVATION`, `NETWORKING_BD`, `DIGITAL`, `CREATIVE`, `MOTION`, `PR_MEDIA`, `CRM_ECOMMERCE`, `VIEWER`.

## Approval workflows

1. **Estimate approval** — `POST /api/sbus/:code/approve-estimates` (admin tier). Flips an SBU's benchmark estimates to "official" (they then enter scores). Logged in `audit_log`. Use only when the CBDO/MD accepts the benchmark as interim official.
2. **Decision cards** — Approve / Reject / Assign / Ask (moderator/admin). Each transition is audit-logged.
3. **Weight changes** — stored in `weight_set` as **proposals** (status `proposed`) until MD approval. Group defaults (25/15/10/20/15/5/10) apply until then.
4. **Target locks** — `kpi_target` / `revenue_target` have `draft / approved / locked` status.

## Data management

### ERP sync (live revenue)
The ERP (iBOSDDD) is queried via the `enterprise-api-gateway` (sales orders → net order value per business unit). The flow:

1. Pull live revenue (agent/MCP or gateway HTTP API `GET /api/v1/data/...`).
2. Write it to `data/erp-revenue.json`.
3. `npm run sync:erp` → upserts into `revenue_actual` with source `ERP/GL (iBOSDDD)` and writes an audit log.

In production this is driven by a scheduled cron that calls the gateway then `POST /api/sync/revenue` (admin tier).

### CSV upload (KPI actuals)
`POST /api/upload/kpi-actuals` — validate → preview → commit. A measured value (High/Med/Web) automatically **clears the estimate flag** on that KPI. Template at `GET /api/templates/kpi-actuals`.

### Data Gap Register
`seed/datagaps.ts` + `GET /api/datagaps`. When a needed number is missing, log it here — never invent it.

## Database

- **Neon Postgres** — project `AR SMS` (`dawn-queen-05598621`), branch `production`.
- **Migrations** — `npx drizzle-kit generate` then `npx drizzle-kit migrate`.
- **Backups** — Neon provides point-in-time restore (automatic). For extra safety, `pg_dump` nightly.

## Environment

Secrets live in `.env.local` (gitignored). Required for the API:

- `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`) — Neon Postgres
- `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` — Neon Auth
- `CORS_ORIGIN` — frontend origin(s), comma-separated (default `http://localhost:5173`)

Frontend: `VITE_NEON_AUTH_URL` in `apps/web/.env`.

## Deploy (Vercel + Neon)

**Deploy only after explicit MD/CBDO confirmation.** Steps:

1. Push `main` to GitHub (`abirulislam-ops/akij-mms`).
2. Vercel: import the repo, two projects — `apps/api` (Hono → serverless) and `apps/web` (Vite static).
3. Set env vars in Vercel (above) + `CORS_ORIGIN` = the web URL.
4. Point the API at the production Neon branch; run migrations + seeds once.
5. Configure the ERP sync cron.

### Live URLs (production)

- **Web:** https://akij-mms-web.vercel.app
- **API:** https://akij-mms-api.vercel.app
- **Neon Auth trusted domain:** `https://akij-mms-web.vercel.app` (added via `neon neon-auth domain add`)

### Deploy notes

- The API is bundled to `apps/api/api/index.js` (esbuild `npm run bundle` in `apps/api`) so Vercel's `npm install` succeeds without the private `@akij-mms/*` workspace packages on npm. Re-run `npm run bundle` after changing API source, then `vercel deploy --prod`.
- The web copies `packages/ui/src/tokens.css` into `apps/web/src/tokens.css` (import is relative) so the web has no workspace dependency either.
- Vercel "Deployment Protection" (SSO) was disabled on both projects so the app is publicly reachable; re-enable if you want a login wall in front.

## Audit trail

Every create/update/approve is written to `audit_log` (entity, before/after, by user, timestamp). View via `GET /api/sync/log` (revenue) or query the table directly.
