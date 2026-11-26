import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

type Rag = "green" | "amber" | "red" | "grey";

interface Scored {
  score: number | null;
  coverage: number;
}
interface DimRow {
  id: string;
  name: string;
  weight: number;
  score: number | null;
  coverage: number;
}
interface KpiRow {
  code: string;
  name: string;
  dimension: string;
  dimensionName: string;
  unit: string;
  direction: string;
  fourP: string | null;
  weightInDimension: number;
  isEstimate: boolean;
  actual: number | null;
  target: number | null;
  confidence: string | null;
  source: string | null;
  asOf: string | null;
  attainment: number | null;
  score: number | null;
  rag: Rag;
}
interface CampRow {
  id: number;
  name: string;
  company: string;
  channel: string;
  status: string;
  isCompetitor: boolean;
  spend: number | null;
  spendEstimated: boolean;
  confidence: string;
  reach: number | null;
  impressions: number | null;
  ctr: number | null;
}
interface ShareRow {
  name: string;
  share: number | null;
  isEstimate: boolean;
}
interface HubData {
  sbu: {
    code: string;
    name: string;
    legalName: string | null;
    category: string | null;
    businessModel: string;
    archetype: string | null;
    custodian: string | null;
    businessHead: string | null;
  };
  indices: { BEI: Scored; BHI: Scored; BPI: Scored; Composite: Scored };
  dimensions: DimRow[];
  kpis: KpiRow[];
  campaigns: { online: CampRow[]; offline: CampRow[] };
  market: { own: ShareRow[]; competitors: ShareRow[] };
  revenue: { base: number | null; targets: { period: string; value: number | null }[] };
  budget: { period: string; value: number; status: string } | null;
  maturity: { assessedAt: string; level: number | null; score: number | null; dimScores: Record<string, number> | null } | null;
}

const IDX: { key: keyof HubData["indices"]; label: string; sub: string; color: string }[] = [
  { key: "Composite", label: "Composite", sub: "All 7 dimensions", color: "var(--composite)" },
  { key: "BEI", label: "BEI", sub: "D1 Brand Equity", color: "var(--bei)" },
  { key: "BHI", label: "BHI", sub: "D2+D3+D6", color: "var(--bhi)" },
  { key: "BPI", label: "BPI", sub: "D4+D5+D7", color: "var(--bpi)" },
];

const RAG_COLOR: Record<Rag, string> = { green: "var(--green)", amber: "var(--amber)", red: "var(--red)", grey: "var(--muted)" };
const RAG_LABEL: Record<Rag, string> = { green: "On/Above target", amber: "90–99%", red: "Below 90%", grey: "Not measured" };

function fmt(n: number | null | undefined, d = 2): string {
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });
}

function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${(n * 100).toFixed(0)}%`;
}

function shareColor(s: number | null): string {
  if (s == null) return "var(--muted)";
  if (s >= 4) return "var(--green)";
  if (s >= 3) return "var(--amber)";
  return "var(--red)";
}

export default function Hub() {
  const { code } = useParams<{ code: string }>();
  const [tab, setTab] = useState("overview");
  const [sub, setSub] = useState<"online" | "offline">("online");
  const { data, isLoading, error } = useQuery({
    queryKey: ["sbu-hub", code],
    queryFn: () => apiFetch<HubData>(`/api/sbus/${code}/hub`),
  });

  if (isLoading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;
  const d = data!;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={{ fontSize: 12, color: "var(--blue)", textDecoration: "none" }}>← Cockpit</Link>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: "6px 0 0", fontSize: 22 }}>{d.sbu.name}</h1>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{d.sbu.category}</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
          {d.sbu.legalName} · {d.sbu.businessModel}
          {d.sbu.custodian && d.sbu.custodian !== "—" ? ` · custodian ${d.sbu.custodian}` : ""}
        </div>
      </div>

      <div className="kpis" style={{ marginBottom: 16 }}>
        {IDX.map((ix) => {
          const v = d.indices[ix.key];
          return (
            <div key={ix.key} className="kpi" style={{ borderLeftColor: ix.color }}>
              <div className="v" style={{ color: ix.key === "Composite" ? shareColor(v.score) : ix.color }}>{v.score == null ? "—" : v.score.toFixed(2)}</div>
              <div className="l">{ix.label} <span style={{ color: "var(--muted)" }}>· {ix.sub}</span></div>
              <div className="l" style={{ marginTop: 2 }}>{pct(v.coverage)} measured</div>
            </div>
          );
        })}
      </div>

      <div className="tabs">
        {["overview", "brand-health", "market", "campaigns", "4p", "maturity"].map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "brand-health" ? "Brand Health" : t === "4p" ? "4P Studio" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview d={d} />}
      {tab === "brand-health" && <BrandHealth d={d} />}
      {tab === "market" && <Market d={d} />}
      {tab === "campaigns" && <Campaigns d={d} sub={sub} setSub={setSub} />}
      {tab === "4p" && <FourP d={d} />}
      {tab === "maturity" && <Maturity d={d} />}
    </div>
  );
}

function Overview({ d }: { d: HubData }) {
  const dims = d.dimensions;
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="card">
        <h3>Dimension scores (CBDO framework)</h3>
        {dims.map((dim) => (
          <div className="bar-row" key={dim.id} style={{ gridTemplateColumns: "210px 1fr 48px" }}>
            <span style={{ fontWeight: 700 }}>{dim.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({dim.weight}%)</span></span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(dim.score ?? 0) / 5 * 100}%`, background: shareColor(dim.score) }} />
            </div>
            <span className="bar-val">{dim.score == null ? "—" : dim.score.toFixed(2)}</span>
          </div>
        ))}
        <div className="muted-line" style={{ marginTop: 8 }}>Coverage = share of dimension weight that is measured (estimates excluded).</div>
      </div>

      <div className="card">
        <h3>Revenue & budget</h3>
        <div className="kpi" style={{ marginBottom: 12 }}>
          <div className="v">{fmt(d.revenue.base)}</div>
          <div className="l">FY25-26 revenue (BDT Cr)</div>
        </div>
        <table className="tbl">
          <thead><tr><th>Period</th><th className="num">Revenue target (BDT Cr)</th></tr></thead>
          <tbody>
            {d.revenue.targets.map((t) => (
              <tr key={t.period}><td>{t.period}</td><td className="num">{fmt(t.value)}</td></tr>
            ))}
          </tbody>
        </table>
        {d.budget && (
          <div className="muted-line" style={{ marginTop: 12 }}>
            Marketing budget {d.budget.period}: <b>{fmt(d.budget.value)} BDT Cr</b> ({d.budget.status})
          </div>
        )}
      </div>
    </div>
  );
}

function BrandHealth({ d }: { d: HubData }) {
  const byDim = useMemo(() => {
    const m = new Map<string, KpiRow[]>();
    for (const k of d.kpis) {
      const arr = m.get(k.dimension) ?? [];
      arr.push(k);
      m.set(k.dimension, arr);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [d.kpis]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      {byDim.map(([dim, kpis]) => (
        <div className="card" key={dim}>
          <h3>{kpis[0].dimensionName}</h3>
          <table className="tbl">
            <thead>
              <tr><th>KPI</th><th className="num">Actual</th><th className="num">Target</th><th className="num">Attainment</th><th className="num">Score</th><th>Status</th><th>Confidence</th></tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k.code}>
                  <td>
                    <span style={{ fontWeight: 700 }}>{k.name}</span>
                    {k.isEstimate && <span className="badge Estimate" style={{ marginLeft: 6 }}>Estimate</span>}
                    <div className="muted-line">{k.unit} · {k.fourP ?? "—"}</div>
                  </td>
                  <td className="num mono">{fmt(k.actual)}</td>
                  <td className="num mono">{fmt(k.target)}</td>
                  <td className="num mono">{k.attainment == null ? "—" : `${(k.attainment * 100).toFixed(0)}%`}</td>
                  <td className="num">{k.score == null ? "—" : k.score}</td>
                  <td><span className="rag" style={{ color: RAG_COLOR[k.rag] }}>{RAG_LABEL[k.rag]}</span></td>
                  <td>{k.confidence ? <span className={`badge ${k.confidence}`}>{k.confidence}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function Market({ d }: { d: HubData }) {
  const all = [...d.market.own, ...d.market.competitors].filter((s) => s.share != null);
  const maxShare = Math.max(1, ...all.map((s) => s.share as number));
  const ownNames = new Set(d.market.own.map((o) => o.name));

  const rows = [...d.market.own, ...d.market.competitors].sort((a, b) => (b.share ?? -1) - (a.share ?? -1));

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="card">
        <h3>Market share (FY25-26)</h3>
        {rows.map((r) => (
          <div className="bar-row" key={r.name} style={{ gridTemplateColumns: "150px 1fr 60px" }}>
            <span style={{ fontWeight: ownNames.has(r.name) ? 800 : 400 }}>{r.name}{ownNames.has(r.name) && " ★"}</span>
            <div className="bar-track">
              <div
                className={`bar-fill ${r.isEstimate ? "estimate" : ""}`}
                style={{ width: `${((r.share ?? 0) / maxShare) * 100}%`, background: ownNames.has(r.name) ? "var(--blue)" : "var(--muted)" }}
              />
            </div>
            <span className="bar-val">{r.share == null ? "n/a" : `${r.share.toFixed(2)}%`}</span>
          </div>
        ))}
        <div className="muted-line" style={{ marginTop: 8 }}>★ own brand · striped bars are estimates (not ERP-verified).</div>
      </div>

      <div className="card">
        <h3>Revenue trajectory</h3>
        <table className="tbl">
          <thead><tr><th>Period</th><th className="num">Revenue (BDT Cr)</th><th className="num">YoY</th></tr></thead>
          <tbody>
            {(() => {
              const pts = [{ period: "FY25-26", value: d.revenue.base }, ...d.revenue.targets];
              return pts.map((p, i) => {
                const prev = i > 0 ? pts[i - 1].value : null;
                const yoy = p.value != null && prev != null && prev !== 0 ? ((p.value - prev) / prev) * 100 : null;
                return (
                  <tr key={p.period}>
                    <td>{p.period}{i === 0 ? " (base)" : ""}</td>
                    <td className="num mono">{fmt(p.value)}</td>
                    <td className="num mono" style={{ color: yoy == null ? "var(--muted)" : yoy >= 0 ? "var(--green)" : "var(--red)" }}>
                      {yoy == null ? "—" : `${yoy >= 0 ? "+" : ""}${yoy.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
        {d.budget && <div className="muted-line" style={{ marginTop: 12 }}>Budget {d.budget.period}: <b>{fmt(d.budget.value)} BDT Cr</b></div>}
      </div>
    </div>
  );
}

function Campaigns({ d, sub, setSub }: { d: HubData; sub: "online" | "offline"; setSub: (s: "online" | "offline") => void }) {
  const rows = sub === "online" ? d.campaigns.online : d.campaigns.offline;
  const own = rows.filter((r) => !r.isCompetitor);
  const comp = rows.filter((r) => r.isCompetitor);
  const ownSpend = own.reduce((a, r) => a + (r.spend ?? 0), 0);
  const compSpend = comp.reduce((a, r) => a + (r.spend ?? 0), 0);

  return (
    <div>
      <div className="subtabs">
        <button className={`sub ${sub === "online" ? "active" : ""}`} onClick={() => setSub("online")}>Online ({d.campaigns.online.length})</button>
        <button className={`sub ${sub === "offline" ? "active" : ""}`} onClick={() => setSub("offline")}>Offline ({d.campaigns.offline.length})</button>
      </div>

      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="v">{fmt(ownSpend)}</div><div className="l">Own {sub} spend (BDT Cr)</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--blue)" }}><div className="v">{fmt(compSpend)}</div><div className="l">Competitor {sub} spend (est.)</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--teal)" }}><div className="v">{rows.length}</div><div className="l">{sub} campaigns tracked</div></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Company</th>
              <th>Channel</th>
              <th className="num">Spend (BDT Cr)</th>
              {sub === "online" && <><th className="num">Reach</th><th className="num">Impressions</th></>}
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: r.isCompetitor ? 400 : 800 }}>{r.company}{r.isCompetitor ? "" : " ★"}</td>
                <td className="muted-line">{r.channel}</td>
                <td className="num mono">{fmt(r.spend)}{r.spendEstimated ? <span className="badge Estimate" style={{ marginLeft: 6 }}>est</span> : null}</td>
                {sub === "online" && <><td className="num mono">{r.reach != null ? r.reach.toLocaleString("en-IN") : "—"}</td><td className="num mono">{r.impressions != null ? r.impressions.toLocaleString("en-IN") : "—"}</td></>}
                <td>{r.confidence ? <span className={`badge ${r.confidence}`}>{r.confidence}</span> : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={sub === "online" ? 7 : 4} className="muted-line">No {sub} campaign data for this SBU yet.</td></tr>}
          </tbody>
        </table>
        <div className="muted-line" style={{ marginTop: 8 }}>★ own activity · competitor spend is estimated from media monitoring.</div>
      </div>
    </div>
  );
}

function FourP({ d }: { d: HubData }) {
  const ps = ["Product", "Price", "Place", "Promotion"] as const;
  const color: Record<string, string> = { Product: "var(--blue)", Price: "var(--bpi)", Place: "var(--teal)", Promotion: "var(--composite)" };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {ps.map((p) => {
        const kpis = d.kpis.filter((k) => k.fourP === p);
        return (
          <div className="card" key={p}>
            <h3 style={{ color: color[p] }}>{p} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({kpis.length} KPIs)</span></h3>
            {kpis.length === 0 ? (
              <div className="muted-line">No {p} KPIs assigned.</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>KPI</th><th className="num">Actual</th><th className="num">Target</th><th className="num">Score</th></tr></thead>
                <tbody>
                  {kpis.map((k) => (
                    <tr key={k.code}>
                      <td>{k.name}{k.isEstimate && <span className="badge Estimate" style={{ marginLeft: 6 }}>Estimate</span>}</td>
                      <td className="num mono">{fmt(k.actual)}</td>
                      <td className="num mono">{fmt(k.target)}</td>
                      <td className="num">{k.score == null ? "—" : k.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Maturity({ d }: { d: HubData }) {
  if (!d.maturity) {
    return <div className="card"><div className="muted-line">No brand-maturity assessment recorded for this SBU yet.</div></div>;
  }
  const m = d.maturity;
  const dims = m.dimScores ? Object.entries(m.dimScores) : [];
  const label: Record<string, string> = { strategy: "Strategy", identity: "Identity", governance: "Governance", cx: "Customer Experience", digital: "Digital", measurement: "Measurement" };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="card">
        <h3>Brand maturity</h3>
        <div className="kpis">
          <div className="kpi"><div className="v">{m.score == null ? "—" : m.score.toFixed(2)}</div><div className="l">Maturity score (0–5)</div></div>
          <div className="kpi" style={{ borderLeftColor: "var(--teal)" }}><div className="v">{m.level == null ? "—" : `L${m.level}`}</div><div className="l">Maturity level</div></div>
        </div>
        <div className="muted-line" style={{ marginTop: 12 }}>Assessed {m.assessedAt}</div>
      </div>
      <div className="card">
        <h3>Dimension scores</h3>
        {dims.map(([k, v]) => (
          <div className="bar-row" key={k} style={{ gridTemplateColumns: "120px 1fr 40px" }}>
            <span>{label[k] ?? k}</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${(v / 5) * 100}%`, background: shareColor(v) }} /></div>
            <span className="bar-val">{v.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
