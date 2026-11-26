import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface MarketPart {
  ownShare: number | null;
  ownShareEstimate: boolean;
  rank: number | null;
  competitorCount: number;
  marketSize: number | null;
  marketSizeEstimate: boolean;
  marketGrowth: number | null;
  brandGrowth: number | null;
  projectedShare: number | null;
  shareChangePp: number | null;
  verdict: "gain" | "flat" | "loss" | null;
  flags: string[];
  sov: number | null;
  excessSov: number | null;
}
interface BudgetPart {
  budget: number | null;
  campaignSpend: number;
  spendVsPlan: number | null;
  romi: number | null;
  romiEstimate: boolean;
  intensity: number | null;
}
interface PortfolioRow {
  code: string;
  name: string;
  category: string;
  custodian: string;
  composite: number | null;
  bei: number | null;
  bhi: number | null;
  bpi: number | null;
  coverage: number;
  revenueBase: number | null;
  revenueTarget: number | null;
  market: MarketPart | null;
  budget: BudgetPart | null;
}
interface AnalyticsData {
  sbus: PortfolioRow[];
  totals: { totalBudget: number; totalSpend: number };
}

function scoreColor(s: number | null): string {
  if (s == null) return "var(--muted)";
  if (s >= 4) return "var(--green)";
  if (s >= 3) return "var(--amber)";
  return "var(--red)";
}
function fmtScore(s: number | null): string {
  return s == null ? "—" : s.toFixed(2);
}
function fmt(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

export default function Cockpit() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => apiFetch<AnalyticsData>("/api/analytics"),
  });

  if (isLoading) return <div style={{ padding: 32 }}>Loading cockpit…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;

  const sbus = data?.sbus ?? [];
  const measured = sbus.filter((s) => s.composite != null);
  const avgComposite = measured.length ? measured.reduce((a, s) => a + (s.composite as number), 0) / measured.length : null;
  const totalRevBase = sbus.reduce((a, s) => a + (s.revenueBase ?? 0), 0);
  const flagged = sbus.filter((s) => (s.market?.flags?.length ?? 0) > 0);

  // bubble matrix scale
  const growths = sbus.map((s) => s.market?.brandGrowth ?? 0).filter((g) => g != null);
  const maxG = Math.max(60, ...growths.map((g) => Math.abs(g)));
  const shares = sbus.map((s) => s.market?.shareChangePp ?? 0);
  const maxS = Math.max(5, ...shares.map((s) => Math.abs(s)));
  const maxRev = Math.max(1, ...sbus.map((s) => s.revenueBase ?? 0));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Executive Cockpit</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>All SBUs · Composite Brand Score (0–5) · revenue ↔ market-share reconciliation</div>
      </div>

      <div className="kpis" style={{ marginBottom: 24 }}>
        <div className="kpi"><div className="v">{sbus.length}</div><div className="l">SBUs</div></div>
        <div className="kpi"><div className="v">{fmtScore(avgComposite)}</div><div className="l">Group composite (avg)</div></div>
        <div className="kpi"><div className="v">{measured.length}/{sbus.length}</div><div className="l">SBUs measured</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--blue)" }}><div className="v">{totalRevBase.toLocaleString("en-IN")}</div><div className="l">FY25-26 revenue (BDT Cr)</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--red)" }}><div className="v">{flagged.length}</div><div className="l">SBUs with strategy flags</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3>Portfolio bubble matrix</h3>
          <div className="muted-line" style={{ marginBottom: 6 }}>X = revenue growth · Y = share change · size = revenue · colour = composite.</div>
          <svg viewBox="0 0 440 300" style={{ width: "100%", height: "auto" }} role="img" aria-label="Portfolio bubble matrix: revenue growth vs share change">
            {/* axes */}
            <line x1={220} y1={20} x2={220} y2={280} stroke="var(--line)" />
            <line x1={20} y1={150} x2={420} y2={150} stroke="var(--line)" />
            <text x={420} y={145} fontSize={9} textAnchor="end" fill="var(--muted)">revenue growth →</text>
            <text x={225} y={24} fontSize={9} fill="var(--muted)">↑ share change</text>
            {sbus.map((s) => {
              const g = s.market?.brandGrowth ?? 0;
              const sh = s.market?.shareChangePp ?? 0;
              const x = 220 + (g / maxG) * 180;
              const y = 150 - (sh / maxS) * 120;
              const r = 6 + Math.sqrt(s.revenueBase ?? 0) / Math.sqrt(maxRev) * 22;
              return (
                <g key={s.code}>
                  <circle cx={x} cy={y} r={r} fill={scoreColor(s.composite)} opacity={0.35} />
                  <circle cx={x} cy={y} r={r} fill="none" stroke={scoreColor(s.composite)} strokeWidth={1.5} />
                  <text x={x} y={y + 3} fontSize={8} textAnchor="middle" fontWeight={700} fill={scoreColor(s.composite)}>{s.code}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="card">
          <h3>Strategy flags (revenue ↔ share)</h3>
          {flagged.length === 0 ? (
            <div className="muted-line">No reconciliation flags across the group.</div>
          ) : (
            <table className="tbl">
              <tbody>
                {flagged.map((s) => (
                  <tr key={s.code}>
                    <td><Link to={`/market/${s.code}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{s.name}</Link></td>
                    <td className="muted-line">{s.market?.flags.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="muted-line" style={{ marginTop: 10 }}>Total budget {fmt(data?.totals.totalBudget)} Cr · tracked spend {fmt(data?.totals.totalSpend)} Cr.</div>
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>SBU</th>
              <th>Category</th>
              <th className="num">Composite</th>
              <th className="num">BEI</th>
              <th className="num">BHI</th>
              <th className="num">BPI</th>
              <th className="num">Coverage</th>
              <th className="num">Share</th>
              <th className="num">Revenue (Cr)</th>
            </tr>
          </thead>
          <tbody>
            {sbus.map((s) => (
              <tr key={s.code}>
                <td><Link to={`/sbu/${s.code}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{s.name}</Link></td>
                <td style={{ color: "var(--muted)" }}>{s.category}</td>
                <td className="num"><span className="rag" style={{ color: scoreColor(s.composite) }}>{fmtScore(s.composite)}</span></td>
                <td className="num idx-bei">{fmtScore(s.bei)}</td>
                <td className="num idx-bhi">{fmtScore(s.bhi)}</td>
                <td className="num idx-bpi">{fmtScore(s.bpi)}</td>
                <td className="num">{(s.coverage * 100).toFixed(0)}%</td>
                <td className="num mono">{s.market?.ownShare != null ? `${s.market.ownShare}%` : "—"}</td>
                <td className="num">{s.revenueBase != null ? s.revenueBase.toLocaleString("en-IN") : "—"} → {s.revenueTarget != null ? s.revenueTarget.toLocaleString("en-IN") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
