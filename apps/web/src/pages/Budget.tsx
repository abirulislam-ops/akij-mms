import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

function fmt(n: number | null | undefined, d = 1): string {
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });
}

interface BudgetRow {
  code: string;
  name: string;
  budget: number | null;
  campaignSpend: number;
  spendVsPlan: number | null;
  romi: number | null;
  romiEstimate: boolean;
  intensity: number | null;
}
interface BudgetData {
  rows: BudgetRow[];
  totalBudget: number;
  totalSpend: number;
}

function romiColor(r: number | null): string {
  if (r == null) return "var(--muted)";
  if (r >= 5) return "var(--green)";
  if (r >= 3.5) return "var(--amber)";
  return "var(--red)";
}

export default function Budget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["budget"],
    queryFn: () => apiFetch<BudgetData>("/api/budget"),
  });
  if (isLoading) return <div style={{ padding: 32 }}>Loading budget…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;
  const d = data!;

  const rows = [...d.rows].sort((a, b) => (b.romi ?? -1) - (a.romi ?? -1));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Budget & ROMI</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Marketing budget plan vs campaign spend (own campaigns only) · ROMI from the framework baseline (estimates flagged).
      </div>

      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi"><div className="v">{fmt(d.totalBudget)}</div><div className="l">Total FY26-27 budget (BDT Cr)</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--blue)" }}><div className="v">{fmt(d.totalSpend)}</div><div className="l">Total campaign spend tracked</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--teal)" }}>
          <div className="v">{d.totalBudget > 0 ? `${((d.totalSpend / d.totalBudget) * 100).toFixed(0)}%` : "—"}</div>
          <div className="l">Spend vs budget (tracked)</div>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>SBU</th>
              <th className="num">Budget (Cr)</th>
              <th className="num">Campaign spend</th>
              <th className="num">vs plan</th>
              <th className="num">ROMI</th>
              <th className="num">Intensity (% rev)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td><Link to={`/sbu/${r.code}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{r.name}</Link></td>
                <td className="num mono">{fmt(r.budget)}</td>
                <td className="num mono">{fmt(r.campaignSpend)}</td>
                <td className="num mono">{r.spendVsPlan != null ? `${r.spendVsPlan}%` : "—"}</td>
                <td className="num">
                  <span className="rag" style={{ color: romiColor(r.romi) }}>{r.romi != null ? `${r.romi}x` : "—"}</span>
                  {r.romiEstimate && r.romi != null && <span className="badge Estimate" style={{ marginLeft: 4 }}>est</span>}
                </td>
                <td className="num mono">{r.intensity != null ? `${r.intensity}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="muted-line" style={{ marginTop: 10 }}>ROMI league table sorted high→low · campaign spend is a partial proxy (only tracked own campaigns, not full media invoices).</div>
      </div>
    </div>
  );
}
