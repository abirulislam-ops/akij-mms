import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import SbuSelect from "../components/SbuSelect";

interface FunnelStep {
  code: string;
  label: string;
  value: number | null;
  confidence: string | null;
  isEstimate: boolean;
}
interface HealthData {
  sbu: { code: string; name: string };
  funnel: FunnelStep[];
  nps: { value: number; confidence: string; isEstimate: boolean } | null;
}

export default function Health() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["health", code],
    queryFn: () => apiFetch<HealthData>(`/api/health/${code}`),
  });
  if (isLoading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;
  const d = data!;
  const max = Math.max(1, ...d.funnel.map((f) => f.value ?? 0));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SbuSelect base="/health" value={code} />
      </div>
      <h1 style={{ margin: "4px 0", fontSize: 22 }}>{d.sbu.name} — Brand Health</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Awareness → advocacy funnel from research baselines. Striped = benchmark estimate (replace with Quantum study).
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Awareness → advocacy funnel</h3>
        <svg viewBox="0 0 700 180" style={{ width: "100%", height: "auto" }}>
          {d.funnel.map((f, i) => {
            const w = Math.max(40, ((f.value ?? 0) / max) * 520);
            const y = 18 + i * 34;
            const h = 24;
            return (
              <g key={f.code}>
                <text x={0} y={y + h - 8} fontSize={12} fill="var(--muted)">{f.label}</text>
                <rect x={120} y={y} width={w} height={h} rx={6} fill={f.isEstimate ? "url(#est)" : "var(--blue)"} />
                <text x={130 + w} y={y + h - 8} fontSize={12} fontWeight={700} fill={f.isEstimate ? "var(--muted)" : "var(--blue)"}>{f.value == null ? "—" : `${f.value}%`}</text>
              </g>
            );
          })}
          <defs>
            <pattern id="est" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#cfd6e0" />
              <rect width="4" height="8" fill="#bcc6d2" />
            </pattern>
          </defs>
        </svg>
      </div>

      <div className="card">
        <h3>Net Promoter Score</h3>
        {d.nps ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div className="kpi" style={{ minWidth: 180 }}>
              <div className="v">{d.nps.value}</div>
              <div className="l">NPS baseline {d.nps.isEstimate && <span className="badge Estimate">estimate</span>}</div>
            </div>
            <div className="muted-line">NPS = % promoters − % detractors (−100…100). Replace with a real tracking wave.</div>
          </div>
        ) : (
          <div className="muted-line">No NPS recorded — Data Gap Register.</div>
        )}
      </div>
    </div>
  );
}
