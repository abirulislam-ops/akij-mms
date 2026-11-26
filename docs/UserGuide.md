# MMS — User Guide

A quick tour of the Marketing Management System for MD, CBDO and functional owners.

## Sign in

Open the app and sign in with your email + password (Neon Auth). Your role determines what you can see and do:

- **MD / CBDO** — everything, plus approve/reject/assign decisions, approve estimates, approve weight changes.
- **Strategic Planner & Analysis** — admin: manage data, run ERP sync.
- **Brand Custodian / SBU Head** — input data for your own SBU.
- **Functional owners** — edit your own domain (e.g. Finance → budget/revenue, Research → surveys) across all SBUs.
- **Viewer** — read-only.

The **top bar** has the module navigation and your email. Use the **SBU dropdown** on any per-SBU screen (Market, Health, Strategy) to switch businesses — the screen keeps its current tab.

## Modules

### Executive Cockpit (`/`)
Group dashboard: composite brand score per SBU, a **portfolio bubble matrix** (revenue growth × share change, size = revenue, colour = score), **strategy flags** (revenue↔share inconsistencies) and the SBU table. The 4 KPI tiles show group totals.

### SBU Brand Hub (`/sbu/:code`)
One per SBU. Six tabs:
- **Overview** — BEI/BHI/BPI/Composite + dimension scores + revenue/budget.
- **Brand Health** — every KPI with actual vs target, attainment, score, RAG and confidence badge.
- **Market** — share tracker (own + competitors) + revenue trajectory.
- **Campaigns** — Offline / Online sub-tabs with own vs competitor spend.
- **4P** — KPIs grouped by Product / Price / Place / Promotion.
- **Maturity** — brand-maturity assessment (only Cement has one today).

### Market & Competition (`/market`)
Group table: share, rank, implied market size, market & brand growth, projected share, verdict, flags, SOV−SOM. Click an SBU for the **share tracker** and **revenue↔share reconciliation**.

### Budget & ROMI (`/budget`)
ROMI league table: budget plan vs tracked campaign spend, vs-plan %, ROMI, marketing intensity.

### 4P Studio (`/fourp`)
Cross-SBU scorecard: mean KPI score + coverage per P for every SBU.

### Brand Health (`/health/:code`)
Awareness → consideration → preference → loyalty → advocacy funnel + NPS.

### Strategy & Targets (`/strategy/:code`)
Revenue glide path (FY26–31), KPI target coverage by dimension, weight proposals.

### Decision Support Center (`/decisions`)
- **Alerts** — live rules-based alerts (share loss, SOV<SOM, low coverage, budget overrun).
- **Decision cards** — Approve / Reject / Assign / Ask each card; decisions are logged.
- **What-if** — project market share for a hypothetical revenue-growth rate.

### Coverage (`/coverage`)
SBU × module data-status heatmap (measured / estimate / missing) + the **Data Gap Register**.

### Reports (`/reports`)
Print-ready A4 MD pack (Ctrl/Cmd+P → Save as PDF) + CSV export.

## Reading the labels

- **Confidence badges** — High / Med / Low / Web / **Estimate** (hatched). Estimates are benchmark assumptions and do **not** count in official scores.
- **`est`** next to a number = estimate, not ERP-verified.
- **RAG** — green ≥100% of target, amber 90–99%, red <90%, grey = not measured.
- **Coverage %** — share of a dimension's weight that is actually measured (not estimate).
