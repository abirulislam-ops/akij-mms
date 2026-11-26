# MMS Build — Todo

## Phase 0 — Discovery & confirmation ✅
- [x] Read pilot, MCP tools, Brand Marketing Pack, Maturity Audit
- [x] Confirm SBU list (13, Mediquip excluded), stack (Vercel + Postgres), roles (15), data sources
- [x] Resolve open items (functional roles group-wide · Neon · Auth.js email-OTP)
- [x] Write & approve `docs/MMS_Blueprint.md`

## Phase 1 — Foundation
- [x] Monorepo scaffold (npm workspaces: packages/calc + packages/schema; apps/web, apps/api, packages/ui, seed pending)
- [x] DB schema + Drizzle migrations (31 tables applied to Neon Postgres)
- [x] Auth + RBAC (Neon Auth — Managed Better Auth: JWT verify via JWKS + requireRole/requireTier middleware + 15 roles seeded)
- [x] Calc engine (`packages/calc`) + unit tests (23 passing)
- [x] Design system (`packages/ui`) — tokens (navy/gold/blue/teal, RAG, index colours, tables, cards)
- [x] Data Input Center (CSV upload → validate/preview → commit → audit log + estimate-clearing; data-freshness board; template download)
- [x] Frontend (`apps/web` — React/Vite + @neon/auth + Cockpit + SBU Hub) + live cockpit/SBU API endpoints
- [x] Seed: KPI library (63 KPIs / 7 dims) + CBDO framework + 13 SBUs + fiscal periods + Cement (KPIs, targets, revenue, competitors, budget, maturity) — §8 fixes applied

## Phase 2 — SBU Brand Hub for all 13 SBUs
- [ ] Generic hub driven by `sbu_id` (verify on Cement)
- [ ] Seed every other SBU from its own sources (strategy, KPIs, targets, market/competitors, 4P, budget, campaigns)
- [ ] Coverage table (SBU × module × data status) + approval

## Phase 3 — Executive Cockpit, Market & Competition, Budget & ROMI, Brand Health, 4P Studio, Strategy & Targets

## Phase 4 — Decision Support Center (alerts, Decision Cards, what-if, decision log), Reports (MD pack PDF), ERP/MCP scheduled sync

## Phase 5 — Hardening & handover (perf, security, a11y, backups, user/admin guides, data-update SOP, training) → deploy after confirmation
