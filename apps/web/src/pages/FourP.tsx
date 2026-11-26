import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface PCell {
  score: number | null;
  coverage: number;
  measured: number;
  total: number;
}
interface FourPRow {
  code: string;
  name: string;
  category: string;
  p4: Record<string, PCell>;
}
interface FourPData {
  rows: FourPRow[];
  ps: string[];
}

function cellColor(s: number | null): string {
  if (s == null) return "var(--muted)";
  if (s >= 4) return "var(--green)";
  if (s >= 3) return "var(--amber)";
  return "var(--red)";
}

export default function FourP() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["fourp"],
    queryFn: () => apiFetch<FourPData>("/api/fourp"),
  });
  if (isLoading) return <div style={{ padding: 32 }}>Loading 4P…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;
  const { rows, ps } = data!;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>4P Studio</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Cross-SBU 4P scorecard — average KPI score per P (0–5), from measured KPIs only. Cell shows score (coverage %).
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>SBU</th>
              {ps.map((p) => <th key={p} className="num" style={{ textAlign: "center" }}>{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td><Link to={`/sbu/${r.code}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{r.name}</Link></td>
                {ps.map((p) => {
                  const c = r.p4[p];
                  return (
                    <td key={p} className="num" style={{ textAlign: "center" }} title={`${c.measured}/${c.total} KPIs measured`}>
                      <span style={{ fontWeight: 800, color: cellColor(c.score) }}>{c.score == null ? "—" : c.score.toFixed(2)}</span>
                      <div className="muted-line" style={{ fontSize: 10 }}>{(c.coverage * 100).toFixed(0)}%</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="muted-line" style={{ marginTop: 10 }}>Cell = mean KPI score for that P · sub-line = measured coverage. Click an SBU for the full 4P breakdown.</div>
      </div>
    </div>
  );
}
