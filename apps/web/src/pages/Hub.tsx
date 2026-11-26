import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Scored {
  score: number | null;
  coverage: number;
}

interface HubData {
  sbu: { code: string; name: string; category: string; custodian: string };
  indices: { BEI: Scored; BHI: Scored; BPI: Scored; Composite: Scored };
}

function Card({ label, value, coverage, color }: { label: string; value: number | null; coverage: number; color: string }) {
  return (
    <div className="kpi" style={{ borderLeftColor: color }}>
      <div className="v" style={{ color }}>{value == null ? "—" : value.toFixed(2)}</div>
      <div className="l">{label} <span style={{ color: "var(--muted)" }}>· {(coverage * 100).toFixed(0)}% measured</span></div>
    </div>
  );
}

export default function Hub() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["sbu", code],
    queryFn: () => apiFetch<HubData>(`/api/sbus/${code}`),
  });

  if (isLoading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;

  const { sbu, indices } = data!;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/" style={{ fontSize: 12, color: "var(--blue)", textDecoration: "none" }}>← Cockpit</Link>
        <h1 style={{ margin: "8px 0 0", fontSize: 22 }}>{sbu.name}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{sbu.category} · custodian {sbu.custodian}</div>
      </div>

      <div className="kpis">
        <Card label="Composite" value={indices.Composite.score} coverage={indices.Composite.coverage} color="var(--composite)" />
        <Card label="BEI (D1)" value={indices.BEI.score} coverage={indices.BEI.coverage} color="var(--bei)" />
        <Card label="BHI (D2+D3+D6)" value={indices.BHI.score} coverage={indices.BHI.coverage} color="var(--bhi)" />
        <Card label="BPI (D4+D5+D7)" value={indices.BPI.score} coverage={indices.BPI.coverage} color="var(--bpi)" />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Index mapping (CBDO framework)</h3>
        <table className="tbl">
          <thead>
            <tr><th>Index</th><th>Constituent dimensions</th><th className="num">Score</th><th className="num">Coverage</th></tr>
          </thead>
          <tbody>
            <tr><td>BEI</td><td>D1 Brand Equity (25%)</td><td className="num idx-bei">{indices.BEI.score?.toFixed(2) ?? "—"}</td><td className="num">{(indices.BEI.coverage * 100).toFixed(0)}%</td></tr>
            <tr><td>BHI</td><td>D2 + D3 + D6 (30%)</td><td className="num idx-bhi">{indices.BHI.score?.toFixed(2) ?? "—"}</td><td className="num">{(indices.BHI.coverage * 100).toFixed(0)}%</td></tr>
            <tr><td>BPI</td><td>D4 + D5 + D7 (45%)</td><td className="num idx-bpi">{indices.BPI.score?.toFixed(2) ?? "—"}</td><td className="num">{(indices.BPI.coverage * 100).toFixed(0)}%</td></tr>
            <tr><td>Composite</td><td>All 7 dimensions (100%)</td><td className="num idx-composite">{indices.Composite.score?.toFixed(2) ?? "—"}</td><td className="num">{(indices.Composite.coverage * 100).toFixed(0)}%</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
