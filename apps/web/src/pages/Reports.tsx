import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { getToken } from "../lib/auth";

interface Alert {
  id: string;
  sbuCode: string;
  sbuName: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  impactBdtCr: number | null;
}
interface Row {
  code: string;
  name: string;
  category: string;
  composite: number | null;
  bei: number | null;
  bhi: number | null;
  bpi: number | null;
  coverage: number;
  revenueBase: number | null;
  revenueTarget: number | null;
  market: { ownShare: number | null; projectedShare: number | null; shareChangePp: number | null; verdict: string | null; flags: string[] } | null;
  budget: { budget: number | null; campaignSpend: number; romi: number | null } | null;
}
interface AnalyticsData {
  sbus: Row[];
  totals: { totalBudget: number; totalSpend: number };
}

function scoreColor(s: number | null): string {
  if (s == null) return "#5a6b7c";
  if (s >= 4) return "#1e6b3c";
  if (s >= 3) return "#c87e1a";
  return "#a61c1c";
}
function f(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

async function downloadCsv(path: string, name: string) {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const base = import.meta.env.VITE_API_URL ?? "";
  const res = await fetch(base + path, { headers });
  if (!res.ok) { alert(`Export failed: ${res.status}`); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: () => apiFetch<AnalyticsData>("/api/analytics") });
  const { data: alertsData } = useQuery({ queryKey: ["alerts"], queryFn: () => apiFetch<{ alerts: Alert[] }>("/api/alerts") });

  if (isLoading) return <div style={{ padding: 32 }}>Loading…</div>;
  const d = data!;
  const alerts = alertsData?.alerts ?? [];
  const date = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Reports — MD Marketing Pack</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Print-ready (A4 landscape) · use Ctrl/Cmd+P → Save as PDF.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => window.print()}>Print / PDF</button>
          <button className="btn ghost" onClick={() => downloadCsv("/api/export/cockpit.csv", "akij-mms-cockpit.csv")}>Export CSV</button>
          <button className="btn ghost" onClick={() => downloadCsv("/api/export/coverage.csv", "akij-mms-coverage.csv")}>Coverage CSV</button>
        </div>
      </div>

      <div className="report-head" style={{ borderBottom: "2px solid var(--navy)", paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ margin: 0, color: "var(--navy)" }}>AKIJ Resource — Marketing Management System</h2>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>Monthly MD Pack · {date}</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>13 SBUs · Composite Brand Score (CBDO framework) · revenue ↔ market-share reconciled</div>
      </div>

      <table className="tbl" style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>SBU</th><th>Category</th><th className="num">Composite</th><th className="num">BEI</th><th className="num">BHI</th><th className="num">BPI</th>
            <th className="num">Coverage</th><th className="num">Share</th><th className="num">Proj. share</th><th className="num">Share Δ</th><th className="num">Revenue (Cr)</th><th className="num">ROMI</th>
          </tr>
        </thead>
        <tbody>
          {d.sbus.map((s) => (
            <tr key={s.code}>
              <td style={{ fontWeight: 700 }}>{s.name}</td>
              <td style={{ color: "var(--muted)" }}>{s.category}</td>
              <td className="num"><b style={{ color: scoreColor(s.composite) }}>{s.composite?.toFixed(2) ?? "—"}</b></td>
              <td className="num idx-bei">{s.bei?.toFixed(2) ?? "—"}</td>
              <td className="num idx-bhi">{s.bhi?.toFixed(2) ?? "—"}</td>
              <td className="num idx-bpi">{s.bpi?.toFixed(2) ?? "—"}</td>
              <td className="num">{(s.coverage * 100).toFixed(0)}%</td>
              <td className="num">{s.market?.ownShare != null ? `${s.market.ownShare}%` : "—"}</td>
              <td className="num">{s.market?.projectedShare != null ? `${s.market.projectedShare}%` : "—"}</td>
              <td className="num" style={{ color: (s.market?.shareChangePp ?? 0) < 0 ? "var(--red)" : "var(--green)" }}>{s.market?.shareChangePp != null ? `${s.market.shareChangePp > 0 ? "+" : ""}${s.market.shareChangePp}pp` : "—"}</td>
              <td className="num">{f(s.revenueBase)} → {f(s.revenueTarget)}</td>
              <td className="num">{s.budget?.romi != null ? `${s.budget.romi}x` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <h3>Top alerts ({alerts.length})</h3>
          {alerts.length === 0 ? <div className="muted-line">No alerts.</div> : alerts.slice(0, 8).map((a) => (
            <div key={a.id} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
              <b>{a.sbuName}</b> — {a.message}
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Group summary</h3>
          <table className="tbl">
            <tbody>
              <tr><td>Total budget (Cr)</td><td className="num">{f(d.totals.totalBudget)}</td></tr>
              <tr><td>Tracked campaign spend (Cr)</td><td className="num">{f(d.totals.totalSpend)}</td></tr>
              <tr><td>Group composite (avg)</td><td className="num">{f(d.sbus.filter((s) => s.composite != null).reduce((a, s) => a + (s.composite as number), 0) / Math.max(1, d.sbus.filter((s) => s.composite != null).length))}</td></tr>
              <tr><td>SBUs with strategy flags</td><td className="num">{d.sbus.filter((s) => (s.market?.flags?.length ?? 0) > 0).length}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
