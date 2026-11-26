import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

type Status = "measured" | "estimate" | "missing";
interface ModuleCell {
  key: string;
  label: string;
  status: Status;
  detail: string;
  measured?: number;
}
interface SbuCoverage {
  code: string;
  name: string;
  custodian: string;
  modules: ModuleCell[];
  measuredCount: number;
  estimateCount: number;
  missingCount: number;
  completeness: number;
}
interface CoverageData {
  sbus: SbuCoverage[];
  moduleKeys: string[];
  summary: {
    totalSbus: number;
    totalModules: number;
    measuredCells: number;
    estimateCells: number;
    missingCells: number;
    groupCompleteness: number;
  };
}

const STATUS_META: Record<Status, { color: string; label: string; bg: string }> = {
  measured: { color: "var(--green)", label: "Measured", bg: "#e4f2ea" },
  estimate: { color: "var(--amber)", label: "Estimate", bg: "repeating-linear-gradient(45deg,#fcf3e2,#fcf3e2 4px,#f6e7c8 4px,#f6e7c8 8px)" },
  missing: { color: "var(--red)", label: "Missing", bg: "#fcebeb" },
};

export default function Coverage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["coverage"],
    queryFn: () => apiFetch<CoverageData>("/api/coverage"),
  });

  if (isLoading) return <div style={{ padding: 32 }}>Loading coverage…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;

  const d = data!;
  const s = d.summary;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Data Coverage & Completeness</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>SBU × module data status — measured · estimate (benchmark) · missing. Drives the Data Gap Register and approval.</div>
      </div>

      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="v">{s.totalSbus}</div><div className="l">SBUs</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--green)" }}><div className="v">{(s.groupCompleteness * 100).toFixed(0)}%</div><div className="l">Group completeness (measured cells)</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--amber)" }}><div className="v">{s.estimateCells}</div><div className="l">Estimate cells (need approval)</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--red)" }}><div className="v">{s.missingCells}</div><div className="l">Missing cells (Data Gap)</div></div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ minWidth: 170 }}>SBU</th>
              {d.moduleKeys.map((k) => {
                const label = d.sbus[0]?.modules.find((m) => m.key === k)?.label ?? k;
                return <th key={k} style={{ textAlign: "center" }}>{label}</th>;
              })}
              <th style={{ textAlign: "center" }}>Complete</th>
            </tr>
          </thead>
          <tbody>
            {d.sbus.map((sbu) => (
              <tr key={sbu.code}>
                <td>
                  <Link to={`/sbu/${sbu.code}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{sbu.name}</Link>
                  <div className="muted-line">{sbu.custodian && sbu.custodian !== "—" ? sbu.custodian : "no custodian"}</div>
                </td>
                {sbu.modules.map((m) => {
                  const meta = STATUS_META[m.status];
                  return (
                    <td key={m.key} style={{ textAlign: "center" }}>
                      <span
                        title={`${meta.label}: ${m.detail}`}
                        className="badge"
                        style={{ background: meta.bg, color: meta.color, cursor: "help" }}
                      >
                        {m.status === "measured" ? (m.measured != null ? `${(m.measured * 100).toFixed(0)}%` : "✓") : m.status === "estimate" ? "≈" : "✗"}
                      </span>
                    </td>
                  );
                })}
                <td className="num">
                  <span style={{ fontWeight: 800, color: sbu.completeness >= 0.6 ? "var(--green)" : sbu.completeness >= 0.3 ? "var(--amber)" : "var(--red)" }}>
                    {(sbu.completeness * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="muted-line" style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>Legend:</span>
          <span><span className="badge" style={{ background: STATUS_META.measured.bg, color: STATUS_META.measured.color }}>✓ / %</span> measured</span>
          <span><span className="badge" style={{ background: STATUS_META.estimate.bg, color: STATUS_META.estimate.color }}>≈</span> estimate (benchmark, excluded from official scores)</span>
          <span><span className="badge" style={{ background: STATUS_META.missing.bg, color: STATUS_META.missing.color }}>✗</span> missing → Data Gap Register</span>
        </div>
      </div>
    </div>
  );
}
