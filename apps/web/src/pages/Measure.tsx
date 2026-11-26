import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiFetch, apiPost } from "../lib/api";

interface Row {
  kpiCode: string; name: string; dimension: string; unit: string | null; direction: "higher" | "lower";
  weightInDimension: number; isEstimate: boolean; target: number | null; actual: number | null;
  confidence: string | null; source: string | null;
}
interface Scored { score: number | null; coverage: number }
interface MeasureData {
  sbu: { code: string; name: string };
  period: string;
  rows: Row[];
  indices: { BEI: Scored; BHI: Scored; BPI: Scored; Composite: Scored } | null;
}

const CONF = ["High", "Med", "Low", "Web"];

export default function Measure() {
  const { code = "ACCL" } = useParams();
  const qc = useQueryClient();
  const period = "FY26-27";
  const { data, isLoading, error } = useQuery({
    queryKey: ["measure", code, period],
    queryFn: () => apiFetch<MeasureData>(`/api/sbus/${code}/measure?period=${period}`),
  });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [conf, setConf] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const e: Record<string, string> = {};
    const c: Record<string, string> = {};
    data.rows.forEach((r) => { e[r.kpiCode] = r.actual != null ? String(r.actual) : ""; c[r.kpiCode] = r.confidence ?? (r.isEstimate ? "Low" : "Med"); });
    setEdits(e); setConf(c);
  }, [data]);

  const changed = useMemo(() => data?.rows.filter((r) => edits[r.kpiCode] !== undefined && edits[r.kpiCode] !== (r.actual != null ? String(r.actual) : "")).length ?? 0, [data, edits]);

  if (isLoading) return <div style={{ padding: 32 }}>Loading measurement…</div>;
  if (error || !data) return <div style={{ padding: 32, color: "var(--red)" }}>{String(error ?? "Not found")}</div>;

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const rows = data!.rows
        .filter((r) => edits[r.kpiCode] !== "" && edits[r.kpiCode] != null)
        .map((r) => ({ kpiCode: r.kpiCode, value: Number(edits[r.kpiCode]), confidence: conf[r.kpiCode] || "Med", source: "Custodian input" }));
      await apiPost(`/api/sbus/${code}/measure`, { periodId: period, rows });
      await qc.invalidateQueries({ queryKey: ["measure", code, period] });
      await qc.invalidateQueries({ queryKey: ["cockpit"] });
      await qc.invalidateQueries({ queryKey: ["sbu", code] });
      setMsg("Saved — actuals written to the database; indices recomputed and the Cockpit/Hub now reflect them.");
    } catch (e) { setMsg(String(e)); } finally { setBusy(false); }
  }

  const ix = data.indices;
  const card = (id: string, sc: Scored | undefined, note: string) => {
    const v = sc?.score;
    const col = v == null ? "var(--muted)" : v >= 4 ? "var(--green)" : v >= 3 ? "var(--amber)" : "var(--red)";
    return (
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>{id}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: col }}>{v == null ? "—" : v.toFixed(1)}<span style={{ fontSize: 13, color: "var(--muted)" }}>/5</span></div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{note} · coverage {sc ? Math.round(sc.coverage * 100) : 0}%</div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <Link to={`/sbu/${code}`} style={{ color: "var(--gold2)", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>← {data.sbu.name} hub</Link>
      </div>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Measurement — {data.sbu.name}</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        Custodian input for <b>{period}</b>. Saving writes to <code>kpi_actual</code>, clears the estimate flag, and recomputes the same-period indices — reflected in Cockpit, Hub and Scorecard.
      </div>

      <div className="grid3" style={{ marginBottom: 16 }}>
        {card("BEI", ix?.BEI, "equity")}
        {card("BHI", ix?.BHI, "health")}
        {card("BPI", ix?.BPI, "performance")}
        {card("Composite", ix?.Composite, "all 7")}
      </div>

      {msg && <div className="card" style={{ padding: 10, marginBottom: 12, fontSize: 12 }}>{msg}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr><th>KPI</th><th>Dim</th><th className="num">Wt</th><th className="num">Target</th><th className="num">Actual (edit)</th><th>Confidence</th><th>Source</th></tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.kpiCode}>
                <td><b>{r.name}</b><div className="muted-line">{r.kpiCode} · {r.unit ?? ""}{r.isEstimate && <span className="badge Estimate" style={{ marginLeft: 4 }}>est</span>}</div></td>
                <td>{r.dimension}</td>
                <td className="num">{r.weightInDimension}</td>
                <td className="num mono">{r.target ?? "—"}</td>
                <td className="num"><input type="number" step="any" value={edits[r.kpiCode] ?? ""} onChange={(e) => setEdits({ ...edits, [r.kpiCode]: e.target.value })} style={{ width: 110, textAlign: "right", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 7px", fontFamily: "inherit" }} /></td>
                <td>
                  <select value={conf[r.kpiCode] ?? "Med"} onChange={(e) => setConf({ ...conf, [r.kpiCode]: e.target.value })} style={{ border: "1px solid var(--line)", borderRadius: 7, padding: "5px 6px" }}>
                    {CONF.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="muted-line">{r.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
        <button className="btn gold" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save actuals & recompute"}</button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{changed} changed · {data.rows.filter((r) => r.actual == null).length} unmeasured</span>
      </div>
    </div>
  );
}
