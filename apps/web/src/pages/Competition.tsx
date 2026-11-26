import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiFetch, apiPost } from "../lib/api";

function n(v: number | null | undefined, d = 1): string {
  return v == null ? "—" : v.toLocaleString("en-IN", { maximumFractionDigits: d });
}
function pp(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}pp`;
}
function threatBadge(t: "low" | "med" | "high" | null | undefined) {
  const cls = t === "high" ? "High" : t === "med" ? "Med" : "Low";
  return <span className={`badge ${cls}`}>{t ?? "—"}</span>;
}

interface OverviewRow {
  code: string; name: string; category: string | null;
  ownShare: number | null; ownShareEstimate: boolean; rank: number | null;
  competitorCount: number; threat: "low" | "med" | "high"; activityCount: number;
  latestActivity: string | null; hhi: number | null;
}

export default function Competition() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["competition"],
    queryFn: () => apiFetch<{ sbus: OverviewRow[] }>("/api/competition"),
  });
  if (isLoading) return <div style={{ padding: 32 }}>Loading competition…</div>;
  if (error) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error)}</div>;
  const rows = [...data!.sbus].sort((a, b) => (b.activityCount - a.activityCount) || ((b.ownShare ?? 0) - (a.ownShare ?? 0)));

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Competition Intelligence</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Competitor registry + custodian-entered activity → threat, SOV/SOM, estimated share shift (us vs them).
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>SBU</th><th className="num">Own share</th><th className="num">Rank</th>
              <th className="num">Competitors</th><th className="num">HHI</th><th>Threat</th>
              <th className="num">Activities</th><th className="num">Latest</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td>
                  <Link to={`/competition/${r.code}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{r.name}</Link>
                  <div className="muted-line">{r.category ?? ""}</div>
                </td>
                <td className="num mono">{n(r.ownShare)}%{r.ownShareEstimate && <span className="badge Estimate" style={{ marginLeft: 4 }}>est</span>}</td>
                <td className="num">{r.rank ?? "—"}</td>
                <td className="num">{r.competitorCount}</td>
                <td className="num mono">{r.hhi ?? "—"}</td>
                <td>{threatBadge(r.threat)}</td>
                <td className="num">{r.activityCount}</td>
                <td className="num mono">{r.latestActivity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RegistryRow {
  brandId: number; name: string; own: boolean; share: number | null; isEstimate: boolean;
  positioning: string | null; threatLevel: "low" | "med" | "high"; priceIndex: number | null;
  strengths: string | null; weaknesses: string | null;
}
interface Impact {
  threatScore: number; threatLevel: "low" | "med" | "high"; ourShareDeltaPp: number; theirShareDeltaPp: number;
  implicationsUs: string[]; implicationsThem: string[]; recommendedAction: string;
}
interface ActivityRow {
  id: number; brandId: number; competitor: string; competitorShare: number; activityDate: string;
  activityType: string; activityLabel: string; channel: string | null; spend: number | null;
  reach: number | null; priceChangePct: number | null; message: string | null; notes: string | null; impact: Impact;
}
interface DetailData {
  sbu: { code: string; name: string; category: string | null };
  ownShare: number | null; registry: RegistryRow[]; hhi: number; activities: ActivityRow[];
  aggregate: { maxThreatScore: number; projectedOurDeltaPp: number; projectedTheirDeltaPp: number };
}

const TYPES: [string, string][] = [
  ["price_cut", "Price cut"], ["promotion", "Consumer promotion"], ["tvc", "TV / mass media"],
  ["digital", "Digital / social"], ["dealer_scheme", "Dealer / trade scheme"],
  ["new_product", "New product / SKU"], ["other", "Other"],
];

export function CompetitionDetail() {
  const { code = "ACCL" } = useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["competition", code],
    queryFn: () => apiFetch<DetailData>(`/api/competition/${code}`),
  });

  const competitors = useMemo(() => (data?.registry ?? []).filter((r) => !r.own), [data]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [a, setA] = useState({ brandId: "", activityType: "price_cut", activityDate: new Date().toISOString().slice(0, 10), channel: "", spend: "", reach: "", priceChangePct: "", message: "" });
  const [p, setP] = useState({ brandId: "", positioning: "", threatLevel: "med", priceIndex: "", strengths: "", weaknesses: "" });

  if (isLoading) return <div style={{ padding: 32 }}>Loading {code}…</div>;
  if (error || !data) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error ?? "Not found")}</div>;

  async function submitActivity(e: FormEvent) {
    e.preventDefault();
    if (!a.brandId) { setMsg("Pick a competitor"); return; }
    setBusy(true); setMsg(null);
    try {
      await apiPost(`/api/competition/${code}/activity`, {
        brandId: Number(a.brandId), activityType: a.activityType, activityDate: a.activityDate,
        channel: a.channel || undefined,
        spend: a.spend ? Number(a.spend) : undefined,
        reach: a.reach ? Number(a.reach) / 100 : undefined,
        priceChangePct: a.priceChangePct ? Number(a.priceChangePct) : undefined,
        message: a.message || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["competition", code] });
      await qc.invalidateQueries({ queryKey: ["competition"] });
      setMsg("Activity logged — impact recomputed.");
      setA({ ...a, brandId: "", channel: "", spend: "", reach: "", priceChangePct: "", message: "" });
    } catch (err) { setMsg(String(err)); } finally { setBusy(false); }
  }

  async function submitProfile(e: FormEvent) {
    e.preventDefault();
    if (!p.brandId) { setMsg("Pick a competitor"); return; }
    setBusy(true); setMsg(null);
    try {
      await apiPost(`/api/competition/${code}/competitor`, {
        brandId: Number(p.brandId), positioning: p.positioning || undefined,
        threatLevel: p.threatLevel as "low" | "med" | "high",
        priceIndex: p.priceIndex ? Number(p.priceIndex) : undefined,
        strengths: p.strengths || undefined, weaknesses: p.weaknesses || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["competition", code] });
      setMsg("Competitor profile saved.");
    } catch (err) { setMsg(String(err)); } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <Link to="/competition" style={{ color: "var(--gold2)", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>← Competition overview</Link>
      </div>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>{data.sbu.name} — Competition</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        Own share {n(data.ownShare)}% · HHI {data.hhi} · {competitors.length} competitors · impact is a planning estimate.
      </div>

      <div className="grid3" style={{ marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}><div className="kpi-k">Max threat</div><div className="kpi-v">{data.aggregate.maxThreatScore}<span style={{ fontSize: 13, color: "var(--muted)" }}>/100</span></div><div className="muted-line">{threatBadge(data.aggregate.maxThreatScore >= 65 ? "high" : data.aggregate.maxThreatScore >= 40 ? "med" : "low")}</div></div>
        <div className="card" style={{ padding: 14 }}><div className="kpi-k">Est. our share shift</div><div className="kpi-v" style={{ color: data.aggregate.projectedOurDeltaPp < 0 ? "var(--red)" : "var(--green)" }}>{pp(data.aggregate.projectedOurDeltaPp)}</div><div className="muted-line">from logged activity</div></div>
        <div className="card" style={{ padding: 14 }}><div className="kpi-k">Est. their share shift</div><div className="kpi-v" style={{ color: "var(--amber)" }}>{pp(data.aggregate.projectedTheirDeltaPp)}</div><div className="muted-line">from logged activity</div></div>
      </div>

      {msg && <div className="card" style={{ padding: 10, marginBottom: 12, fontSize: 12 }}>{msg}</div>}

      <h2 style={{ fontSize: 15, margin: "10px 0 8px" }}>Competitor registry</h2>
      <div className="card" style={{ overflowX: "auto", marginBottom: 16 }}>
        <table className="tbl">
          <thead><tr><th>Competitor</th><th className="num">Share</th><th>Positioning</th><th>Threat</th><th className="num">Price index</th><th>Strengths</th><th>Weaknesses</th></tr></thead>
          <tbody>
            {data.registry.filter((r) => !r.own).map((r) => (
              <tr key={r.brandId}>
                <td style={{ fontWeight: 700 }}>{r.name}</td>
                <td className="num mono">{n(r.share)}%{r.isEstimate && <span className="badge Estimate" style={{ marginLeft: 4 }}>est</span>}</td>
                <td className="muted-line">{r.positioning ?? "—"}</td>
                <td>{threatBadge(r.threatLevel)}</td>
                <td className="num mono">{r.priceIndex ?? "—"}</td>
                <td className="muted-line">{r.strengths ?? "—"}</td>
                <td className="muted-line">{r.weaknesses ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 15, margin: "10px 0 8px" }}>Competitor activity &amp; impact</h2>
      <div className="card" style={{ overflowX: "auto", marginBottom: 16 }}>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Competitor</th><th>Activity</th><th className="num">Price Δ</th><th>Impact on us</th><th>Impact on them</th><th>Threat</th><th>Recommended response</th></tr></thead>
          <tbody>
            {data.activities.length === 0 && <tr><td colSpan={8} className="muted-line">No activity logged yet — use the form below.</td></tr>}
            {data.activities.map((x) => (
              <tr key={x.id}>
                <td className="mono">{x.activityDate}</td>
                <td style={{ fontWeight: 700 }}>{x.competitor}</td>
                <td>{x.activityLabel}{x.message ? <div className="muted-line">{x.message}</div> : null}</td>
                <td className="num mono">{x.priceChangePct != null ? `${x.priceChangePct}%` : "—"}</td>
                <td className="muted-line">{x.impact.implicationsUs.join(" ")} <b style={{ color: "var(--red)" }}>{pp(x.impact.ourShareDeltaPp)}</b></td>
                <td className="muted-line">{x.impact.implicationsThem.join(" ")} <b style={{ color: "var(--amber)" }}>{pp(x.impact.theirShareDeltaPp)}</b></td>
                <td>{threatBadge(x.impact.threatLevel)} <span className="mono">{x.impact.threatScore}</span></td>
                <td className="muted-line">{x.impact.recommendedAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid2" style={{ gap: 16 }}>
        <form className="card" style={{ padding: 16 }} onSubmit={submitActivity}>
          <h3 style={{ fontSize: 14, marginTop: 0 }}>Log competitor activity</h3>
          <div className="field"><label>Competitor</label>
            <select value={a.brandId} onChange={(e) => setA({ ...a, brandId: e.target.value })} required>
              <option value="">Select…</option>
              {competitors.map((c) => <option key={c.brandId} value={c.brandId}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Activity type</label>
            <select value={a.activityType} onChange={(e) => setA({ ...a, activityType: e.target.value })}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field"><label>Date</label><input type="date" value={a.activityDate} onChange={(e) => setA({ ...a, activityDate: e.target.value })} /></div>
          <div className="grid2" style={{ gap: 8 }}>
            <div className="field"><label>Price change %</label><input type="number" step="0.1" placeholder="-5" value={a.priceChangePct} onChange={(e) => setA({ ...a, priceChangePct: e.target.value })} /></div>
            <div className="field"><label>Reach % (0–100)</label><input type="number" step="1" placeholder="60" value={a.reach} onChange={(e) => setA({ ...a, reach: e.target.value })} /></div>
          </div>
          <div className="field"><label>Spend (BDT)</label><input type="number" step="1" value={a.spend} onChange={(e) => setA({ ...a, spend: e.target.value })} /></div>
          <div className="field"><label>Message</label><input value={a.message} onChange={(e) => setA({ ...a, message: e.target.value })} placeholder="e.g. 5% price cut + dealer scheme" /></div>
          <button className="btn gold" disabled={busy}>{busy ? "Saving…" : "Save activity"}</button>
        </form>

        <form className="card" style={{ padding: 16 }} onSubmit={submitProfile}>
          <h3 style={{ fontSize: 14, marginTop: 0 }}>Competitor profile</h3>
          <div className="field"><label>Competitor</label>
            <select value={p.brandId} onChange={(e) => setP({ ...p, brandId: e.target.value })} required>
              <option value="">Select…</option>
              {competitors.map((c) => <option key={c.brandId} value={c.brandId}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Positioning</label><input value={p.positioning} onChange={(e) => setP({ ...p, positioning: e.target.value })} placeholder="e.g. price-led, high-strength" /></div>
          <div className="grid2" style={{ gap: 8 }}>
            <div className="field"><label>Threat</label>
              <select value={p.threatLevel} onChange={(e) => setP({ ...p, threatLevel: e.target.value })}><option value="low">low</option><option value="med">med</option><option value="high">high</option></select>
            </div>
            <div className="field"><label>Price index (100=avg)</label><input type="number" step="0.1" value={p.priceIndex} onChange={(e) => setP({ ...p, priceIndex: e.target.value })} /></div>
          </div>
          <div className="field"><label>Strengths</label><input value={p.strengths} onChange={(e) => setP({ ...p, strengths: e.target.value })} /></div>
          <div className="field"><label>Weaknesses</label><input value={p.weaknesses} onChange={(e) => setP({ ...p, weaknesses: e.target.value })} /></div>
          <button className="btn gold" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
        </form>
      </div>
    </div>
  );
}
