# MMS — Data Update SOP

Standard operating procedure for keeping the platform's numbers accurate. **Never invent a number** — log it in the Data Gap Register instead.

## 1. Live revenue (ERP) — monthly / on demand

1. Query iBOSDDD sales orders (net order value) per business unit via the `enterprise-api-gateway`.
2. Convert to **BDT Crore** (÷ 1e7).
3. Save to `data/erp-revenue.json` (update `pulledAt`, `source`, `periodId`, `rows`).
4. Run `npm run sync:erp`.
5. Confirm in the sync log (`GET /api/sync/log`) — each row shows `created` or `updated`.

SBUs with no sales orders in the period (e.g. ACEL, AASL, NJL, ALCL, AMPL) are **not** zero-filled — they stay absent and remain in the Data Gap Register.

## 2. Brand-health research (awareness, TOMA, NPS…) — when a wave lands

When a Quantum/agency study replaces a benchmark estimate:

1. Either upload a CSV (`POST /api/upload/kpi-actuals`) or update `kpi_actual` directly.
2. Use confidence `High` (primary research) or `Med`. A measured value **auto-clears the estimate flag**, so the KPI enters the official score.
3. Close the corresponding Data Gap Register row.

CSV columns: `sbu_code,kpi_code,period,value,confidence,source`.

## 3. Market share & competitors — when new Nielsen/industry data arrives

Update `market_share` (own + competitor rows) and set `is_estimate = false` only when sourced. Update `market_size` growth with the **sourced** CAGR (currently assumptions) and clear the "assumption" note in `source`.

## 4. Budget & campaigns

- **Budget plan** → `budget_plan` (channel `total` + ATL/BTL/Digital/PR).
- **Campaign spend** → `campaign.spend_actual` (own) with `spend_estimated = false`; competitor spend stays `spend_estimated = true`.
- **Budget actuals** → `budget_actual` as invoices land.

## 5. Targets & weights

- **Target changes** → versioned rows in `kpi_target` / `revenue_target` with status `draft` → `approved` → `locked`.
- **Weight changes** → new `weight_set` row (status `proposed`); group defaults apply until MD approval.

## 6. Checklist after any update

- [ ] Source and confidence set on every new value
- [ ] Estimates still marked `is_estimate = true`
- [ ] Audit log written (upload/sync/approve paths do this automatically)
- [ ] Data Gap Register rows closed where applicable
- [ ] Scores/indices recalculated (automatic — no manual step)

## Cadence

| Data | Cadence | Owner |
|---|---|---|
| ERP revenue | Monthly | Finance |
| Brand-health research | Per wave (annual/quarterly) | Research |
| Market share / CAGR | When sourced | Research |
| Campaign spend | Monthly | Digital / Media |
| Budget plan vs actual | Monthly | Finance |
| KPI targets | Annual (FY planning) | SPA |
