import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import SbuSelect from "../components/SbuSelect";

function fmt(n: number | null | undefined, d = 1): string {
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });
}
function pp(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}pp`;
}
function cr(n: number | null | undefined): string {
  return n == null ? "—" : `${n.toLocaleString("en-IN")} Cr`;
}

interface MarketRow {
  code: string;
  name: string;
  category: string;
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

function verdictColor(v: MarketRow["verdict"]): string {
  if (v === "gain") return "var(--green)";
  if (v === "loss") return "var(--red)";
  return "var(--muted)";
}

export default function MarketOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["market"],
    queryFn: () => apiFetch<{ sbus: MarketRow[] }>("/api/market"),
  });
  if (isLoading) return <div style={{ padding: 32 }}>Loading market…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;
  const rows = data!.sbus;

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Market & Competition</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Revenue ↔ market-share reconciliation · implied market size = own revenue ÷ own share · market growth is an assumption (to confirm).
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>SBU</th>
              <th className="num">Share</th>
              <th className="num">Rank</th>
              <th className="num">Market size</th>
              <th className="num">Mkt growth</th>
              <th className="num">Brand growth</th>
              <th className="num">Proj. share</th>
              <th className="num">Share Δ</th>
              <th>Verdict</th>
              <th>Flags</th>
              <th className="num">SOV−SOM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td>
                  <Link to={`/market/${r.code}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{r.name}</Link>
                  <div className="muted-line">{r.competitorCount} competitors tracked</div>
                </td>
                <td className="num mono">{fmt(r.ownShare)}%{r.ownShareEstimate && <span className="badge Estimate" style={{ marginLeft: 4 }}>est</span>}</td>
                <td className="num">{r.rank ?? "—"}</td>
                <td className="num mono">{cr(r.marketSize)}{r.marketSizeEstimate && <span className="badge Estimate" style={{ marginLeft: 4 }}>est</span>}</td>
                <td className="num mono">{r.marketGrowth != null ? `${r.marketGrowth}%` : "—"}</td>
                <td className="num mono" style={{ color: (r.brandGrowth ?? 0) < 0 ? "var(--red)" : "inherit" }}>{r.brandGrowth != null ? `${r.brandGrowth > 0 ? "+" : ""}${r.brandGrowth}%` : "—"}</td>
                <td className="num mono">{fmt(r.projectedShare)}%</td>
                <td className="num mono" style={{ color: (r.shareChangePp ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>{pp(r.shareChangePp)}</td>
                <td><span className="rag" style={{ color: verdictColor(r.verdict) }}>{r.verdict ?? "—"}</span></td>
                <td className="muted-line">{r.flags.length ? r.flags.join(" · ") : "—"}</td>
                <td className="num mono" style={{ color: (r.excessSov ?? 0) < 0 ? "var(--red)" : "var(--green)" }}>{r.excessSov != null ? `${r.excessSov > 0 ? "+" : ""}${r.excessSov}pp` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ShareRow {
  name: string;
  own: boolean;
  share: number | null;
  isEstimate: boolean;
}
interface MarketDetailData {
  sbu: { code: string; name: string; category: string };
  shareRows: ShareRow[];
  ownShare: number | null;
  brandGrowth: number | null;
  marketGrowth: number | null;
  marketSize: number | null;
  marketSizeEstimate: boolean;
  targetShare: number | null;
  sov: number | null;
  excessSov: number | null;
  reconciliation: {
    projectedShare: number;
    shareChangePp: number;
    verdict: "gain" | "flat" | "loss";
    flags: { key: string; label: string }[];
  } | null;
}

export function MarketDetail() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["market", code],
    queryFn: () => apiFetch<MarketDetailData>(`/api/market/${code}`),
  });
  if (isLoading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;
  const d = data!;
  const maxShare = Math.max(1, ...d.shareRows.map((s) => s.share ?? 0));
  const rec = d.reconciliation;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link to="/market" style={{ fontSize: 12, color: "var(--blue)", textDecoration: "none" }}>← Market</Link>
        <SbuSelect base="/market" value={code} />
      </div>
      <h1 style={{ margin: "4px 0", fontSize: 22 }}>{d.sbu.name}</h1>
      <div style={{ color: "var(--muted)", fontSize: 13 }}>{d.sbu.category}</div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card">
          <h3>Share tracker (FY25-26)</h3>
          {d.shareRows.map((s) => (
            <div className="bar-row" key={s.name} style={{ gridTemplateColumns: "140px 1fr 60px" }}>
              <span style={{ fontWeight: s.own ? 800 : 400 }}>{s.name}{s.own && " ★"}</span>
              <div className="bar-track">
                <div className={`bar-fill ${s.isEstimate ? "estimate" : ""}`} style={{ width: `${((s.share ?? 0) / maxShare) * 100}%`, background: s.own ? "var(--blue)" : "var(--muted)" }} />
              </div>
              <span className="bar-val">{s.share == null ? "n/a" : `${s.share.toFixed(2)}%`}</span>
            </div>
          ))}
          <div className="muted-line" style={{ marginTop: 8 }}>★ own brand · striped = estimate (not ERP-verified).</div>
        </div>

        <div className="card">
          <h3>Revenue ↔ share reconciliation</h3>
          <div className="kpis" style={{ marginBottom: 12 }}>
            <div className="kpi"><div className="v">{fmt(d.ownShare)}%</div><div className="l">Current share</div></div>
            <div className="kpi" style={{ borderLeftColor: "var(--teal)" }}><div className="v">{rec ? `${fmt(rec.projectedShare)}%` : "—"}</div><div className="l">Projected share</div></div>
            <div className="kpi" style={{ borderLeftColor: "var(--composite)" }}><div className="v">{rec ? pp(rec.shareChangePp) : "—"}</div><div className="l">Share change</div></div>
          </div>
          <table className="tbl">
            <tbody>
              <tr><td>Brand revenue growth</td><td className="num mono">{d.brandGrowth != null ? `${d.brandGrowth > 0 ? "+" : ""}${d.brandGrowth}%` : "—"}</td></tr>
              <tr><td>Market growth (assumption)</td><td className="num mono">{d.marketGrowth != null ? `${d.marketGrowth}%` : "—"}</td></tr>
              <tr><td>Target share</td><td className="num mono">{d.targetShare != null ? `${fmt(d.targetShare)}%` : "—"}</td></tr>
              <tr><td>Implied market size</td><td className="num mono">{cr(d.marketSize)}{d.marketSizeEstimate && <span className="badge Estimate" style={{ marginLeft: 4 }}>est</span>}</td></tr>
              <tr><td>SOV − SOM</td><td className="num mono" style={{ color: (d.excessSov ?? 0) < 0 ? "var(--red)" : "var(--green)" }}>{d.excessSov != null ? `${d.excessSov > 0 ? "+" : ""}${d.excessSov}pp` : "—"}</td></tr>
            </tbody>
          </table>
          {rec?.flags?.length ? (
            <div style={{ marginTop: 12 }}>
              {rec.flags.map((f) => (
                <div key={f.key} className="badge" style={{ background: "#fcebeb", color: "var(--red)", marginRight: 6 }}>⚠ {f.label}</div>
              ))}
            </div>
          ) : <div className="muted-line" style={{ marginTop: 12 }}>No strategy flags — plan is consistent with the market.</div>}
        </div>
      </div>
    </div>
  );
}
