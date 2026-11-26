import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface SbuRow {
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

export default function Cockpit() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cockpit"],
    queryFn: () => apiFetch<{ sbus: SbuRow[] }>("/api/cockpit"),
  });

  if (isLoading) return <div style={{ padding: 32 }}>Loading cockpit…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;

  const sbus = data?.sbus ?? [];
  const measured = sbus.filter((s) => s.composite != null);
  const avgComposite = measured.length ? measured.reduce((a, s) => a + (s.composite as number), 0) / measured.length : null;
  const totalRevBase = sbus.reduce((a, s) => a + (s.revenueBase ?? 0), 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Executive Cockpit</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>All SBUs · Composite Brand Score (0–5) from live data</div>
      </div>

      <div className="kpis" style={{ marginBottom: 24 }}>
        <div className="kpi"><div className="v">{sbus.length}</div><div className="l">SBUs</div></div>
        <div className="kpi"><div className="v">{fmtScore(avgComposite)}</div><div className="l">Group composite (avg)</div></div>
        <div className="kpi"><div className="v">{measured.length}/{sbus.length}</div><div className="l">SBUs measured</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--blue)" }}><div className="v">{totalRevBase.toLocaleString("en-IN")}</div><div className="l">FY25-26 revenue (BDT Cr)</div></div>
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
                <td className="num">{s.revenueBase != null ? s.revenueBase.toLocaleString("en-IN") : "—"} → {s.revenueTarget != null ? s.revenueTarget.toLocaleString("en-IN") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
