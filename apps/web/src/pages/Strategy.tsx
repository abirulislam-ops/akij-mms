import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import SbuSelect from "../components/SbuSelect";

function fmt(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

interface StrategyData {
  sbu: { code: string; name: string };
  revenue: { base: number | null; targets: { period: string; value: number | null; status: string | null }[] };
  dimSummary: { id: string; name: string; weight: number; kpiCount: number; withTarget: number; approved: number }[];
  weightProposals: { version: number; status: string; weights: Record<string, number>; proposedBy: string | null; approvedBy: string | null }[];
  objectives: { title: string; detail: string | null; target: number | null; unit: string | null }[];
}

export default function Strategy() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["strategy", code],
    queryFn: () => apiFetch<StrategyData>(`/api/strategy/${code}`),
  });
  if (isLoading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;
  const d = data!;

  const pts = [{ period: "FY25-26", value: d.revenue.base }, ...d.revenue.targets];
  const maxRev = Math.max(1, ...pts.map((p) => p.value ?? 0));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SbuSelect base="/strategy" value={code} />
      </div>
      <h1 style={{ margin: "4px 0", fontSize: 22 }}>{d.sbu.name} — Strategy & Targets</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        FY26–31 revenue glide path · KPI target coverage by dimension · weight proposals (awaiting MD approval).
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Revenue glide path (BDT Cr)</h3>
        <svg viewBox="0 0 700 220" style={{ width: "100%", height: "auto" }}>
          <line x1={50} y1={180} x2={680} y2={180} stroke="var(--line)" />
          {pts.map((p, i) => {
            const x = 50 + i * ((680 - 50) / (pts.length - 1 || 1));
            const y = p.value == null ? 180 : 180 - (p.value / maxRev) * 150;
            const prev = pts[i - 1];
            return (
              <g key={p.period}>
                {prev && prev.value != null && p.value != null && (
                  <line x1={50 + (i - 1) * ((680 - 50) / (pts.length - 1))} y1={180 - (prev.value / maxRev) * 150} x2={x} y2={y} stroke="var(--blue)" strokeWidth={2} />
                )}
                <circle cx={x} cy={y} r={4} fill={i === 0 ? "var(--muted)" : "var(--blue)"} />
                <text x={x} y={200} fontSize={10} textAnchor="middle" fill="var(--muted)">{p.period.replace("FY", "")}</text>
                <text x={x} y={y - 10} fontSize={10} textAnchor="middle" fontWeight={700} fill={i === 0 ? "var(--muted)" : "var(--blue)"}>{fmt(p.value)}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <h3>KPI target coverage</h3>
          <table className="tbl">
            <thead><tr><th>Dimension</th><th className="num">Weight</th><th className="num">KPIs</th><th className="num">Target set</th></tr></thead>
            <tbody>
              {d.dimSummary.map((dim) => (
                <tr key={dim.id}>
                  <td>{dim.name}</td>
                  <td className="num">{dim.weight}%</td>
                  <td className="num">{dim.kpiCount}</td>
                  <td className="num" style={{ color: dim.withTarget === dim.kpiCount ? "var(--green)" : "var(--amber)" }}>{dim.withTarget}/{dim.kpiCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Weight proposals</h3>
          {d.weightProposals.length === 0 ? (
            <div className="muted-line">No weight proposals — group defaults (25/15/10/20/15/5/10) apply.</div>
          ) : (
            d.weightProposals.map((w) => (
              <div key={w.version} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>v{w.version} · <span className={`badge ${w.status}`}>{w.status}</span> by {w.proposedBy}</div>
                <div className="muted-line" style={{ marginTop: 4 }}>
                  {Object.entries(w.weights).map(([k, v]) => `d${k.slice(1)}:${v}%`).join(" · ")}
                </div>
              </div>
            ))
          )}
          {d.objectives.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>Strategic objectives</h3>
              {d.objectives.map((o, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{o.title}{o.target != null && ` — ${fmt(o.target)}${o.unit ?? ""}`}</div>
                  {o.detail && <div className="muted-line">{o.detail}</div>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
