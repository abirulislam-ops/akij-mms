# AKIJ Resource — Marketing Management System (MMS)

A dynamic, database-backed marketing decision platform for the **MD** and **CBDO** of AKIJ Resource — covering brand KPIs (BEI/BHI/BPI), strategy targets, revenue vs market share, competitors, campaigns (offline & online), budget & ROMI, 4P, brand maturity, data input and decision support for **all 13 SBUs** (Mediquip excluded).

**When data is entered or updated, every score, index, chart, alert and report recalculates automatically.** No number is hard-coded in the frontend — everything is read from the database and computed by a pure, tested calculation engine.

---

## Stack (actual)

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + TanStack Query + React Router |
| API | Hono (Node server in dev; Vercel Functions for deploy) |
| Database | Neon Postgres + Drizzle ORM |
| Auth | Neon Auth (Managed Better Auth) — JWT verified via JWKS |
| Calc engine | `packages/calc` — pure functions + Vitest |
| Schema | `packages/schema` — Drizzle (33 tables) + migrations |
| Design | `packages/ui` — CSS design tokens (navy/gold/blue/teal) |

## Structure

```
apps/web          # React frontend (Cockpit, SBU Hub, Market, Budget, 4P, Health, Strategy, Decisions, Reports, Coverage)
apps/api          # Hono API (auth, RBAC, scores, market, budget, alerts, decisions, sync, reports)
packages/calc     # pure calculation engine (scoring, indices, reconciliation, ROMI, pacing)
packages/schema   # Drizzle schema + migrations
packages/ui       # design tokens (tokens.css)
seed/             # data migration (dimensions, KPI library, SBUs, roles, Cement, 12 SBUs, campaigns, market, decisions, data gaps)
scripts/          # verification + sync + checks
docs/             # blueprint + guides
data/             # ERP pull snapshots (erp-revenue.json)
```

## KPI framework (CBDO — MD-approved)

7 dimensions — Equity **25** · Health **15** · Positioning **10** · Market **20** · Financial **15** · Digital **5** · Execution **10**.

- **BEI = D1**
- **BHI = D2 + D3 + D6**
- **BPI = D4 + D5 + D7**
- **Composite = all 7**

Scoring: each KPI's actual is scored 0–5 against **that period's target** (≥110% → 5, 100–110% → 4, 90–100% → 3, 80–90% → 2, <80% → 1, unmeasured → "—"). Dimension score = KPI scores weighted by within-dimension weight (measured KPIs only). **Estimates are excluded from official scores** but still count in the coverage denominator — an estimate-heavy SBU shows low coverage ("insufficient data").

## Getting started

```bash
# 1. install (Better Auth transitive peer conflict → legacy-peer-deps)
npm install --legacy-peer-deps

# 2. pull Neon env (writes .env.local — gitignored)
npx neon env pull   # requires `neon` CLI, signed in

# 3. apply migrations
npx drizzle-kit migrate

# 4. seed (idempotent)
npm run seed            # dimensions, KPI library, SBUs, roles, Cement
npm run seed:sbus       # the other 12 SBUs (own data)
npm run seed:campaigns  # campaigns (online/offline) from the AR Marketing sheet
npm run seed:market     # implied market size + growth assumption
npm run seed:decisions  # data-driven decision cards
npm run seed:datagaps   # Data Gap Register

# 5. run
npm run dev --workspace @akij-mms/api   # API on :8787
npm run dev --workspace @akij-mms/web   # web on :5173 (proxies /api, /health)
```

Open **http://localhost:5173** and sign in with any email + password (Neon Auth). A fresh sign-up has **viewer** access until a role is assigned in the DB.

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Type-check everything (`tsc --noEmit`) |
| `npm test` | Run the calc engine unit tests (24) |
| `npm run verify` | Verify the 6 Neon services |
| `npm run sync:erp` | Pull the ERP revenue snapshot → upsert into Postgres |
| `npx drizzle-kit generate` / `migrate` | Schema migrations |

## Data provenance rules (never invent data)

- **Real** — revenue (base + 5-yr targets), NP margins, budget, campaign spend, ERP sales-order revenue, Cement/AIL/ARMCL/ORCA shares.
- **Derived & labelled** — implied market size = `own revenue ÷ own share`; market growth = assumption (flagged "to confirm").
- **Estimate** (hatched, excluded from official scores) — perception KPIs (awareness, TOMA, SOV, NPS, ROMI baseline) until replaced by real research/ERP.
- **Data Gap** — competitor shares (9 SBUs), NPS (12), brand maturity (12), price/distribution → logged in the Data Gap Register.

## Roles & RBAC

15 roles across 5 tiers — enforced on the **API**, not just the UI:

| Tier | Roles | Powers |
|---|---|---|
| moderator | MD, CBDO | approve targets/weights; decide |
| admin | Strategic Planner & Analysis (SPA) | approve estimates, ERP sync, manage data |
| editor | Brand Custodian, SBU Head | input/upload data for own SBU |
| functional | Finance, Research, OOH & Activation, Networking/BD, Digital, Creative, Motion, PR & Media, CRM/E-Commerce | edit own domain, group-wide |
| viewer | Viewer | read-only |

## Documentation

- `docs/MMS_Blueprint.md` — architecture, data model, calc rules, design system
- `docs/TODO.md` — phased build plan (Phase 0–5)
- `docs/UserGuide.md` — how to use each module
- `docs/AdminGuide.md` — RBAC, approvals, data management, ERP sync
- `docs/DataUpdateSOP.md` — standard operating procedure for updating data

## Scope

13 SBUs (Brand Marketing Pack FY 2026-27, Mediquip excluded): ACCL, AIL, ARMCL, AEL, AAFL, ALEL, ABSL, AAIL, ACEL, AASL, NJL, ALCL, AMPL.
