# AKIJ Resource — Marketing Management System (MMS)

A dynamic, database-backed marketing decision platform for the **MD** and **CBDO** of AKIJ Resource — covering brand KPIs (BEI/BHI/BPI), strategy targets, revenue vs market share, competitors, campaigns/activities (offline & online), budget & ROMI, 4P, brand maturity, data input and decision support for **every SBU** (Mediquip excluded).

When data is entered or updated, every score, index, chart, alert and report recalculates automatically.

## Stack
- **Frontend:** React + TypeScript + Vite · TanStack Router · TanStack Query · Tailwind · Apache ECharts · TanStack Table
- **API:** Hono on Vercel Functions
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Auth.js/NextAuth email-OTP + RBAC
- **Files:** Vercel Blob
- **Jobs:** Vercel Cron (ERP/MCP sync, recalc, alerts, MD report)

## Structure
```
apps/web         # React frontend
apps/api         # Hono API (Vercel Functions)
packages/calc    # pure calculation engine (scoring, indices, reconciliation, ROMI)
packages/schema  # Zod + Drizzle schema
packages/ui      # design system + infographic components
seed/            # data migration from pilot + source files
docs/            # blueprint, guides
```

## KPI framework (CBDO)
7 dimensions — Equity 25 · Health 15 · Positioning 10 · Market 20 · Financial 15 · Digital 5 · Execution 10.
**BEI = D1 · BHI = D2+D3+D6 · BPI = D4+D5+D7 · Composite = all 7.**

## Documentation
- `docs/MMS_Blueprint.md` — architecture, data model, calc rules, design system
- `docs/TODO.md` — phased build plan

## Scope
13 SBUs (Brand Marketing Pack FY 2026-27, Mediquip excluded).
