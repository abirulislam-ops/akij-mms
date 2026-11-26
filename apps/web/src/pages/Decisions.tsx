import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch, apiPost } from "../lib/api";

type Severity = "critical" | "high" | "medium" | "low";
interface Alert {
  id: string;
  sbuCode: string;
  sbuName: string;
  severity: Severity;
  rule: string;
  message: string;
  impactBdtCr: number | null;
}
interface Decision {
  id: number;
  sbuCode: string | null;
  sbuName: string | null;
  title: string;
  whatHappened: string | null;
  why: string | null;
  impact: string | null;
  options: { label: string; description?: string }[] | null;
  recommendation: string | null;
  owner: string | null;
  dueDate: string | null;
  status: "open" | "approved" | "rejected" | "assigned" | "done";
  decidedBy: string | null;
  decidedAt: string | null;
}
interface SbuOption {
  code: string;
  name: string;
}

const SEV_COLOR: Record<Severity, string> = { critical: "var(--red)", high: "#c0561f", medium: "var(--amber)", low: "var(--muted)" };
const STATUS_COLOR: Record<Decision["status"], string> = {
  open: "var(--blue)", approved: "var(--green)", rejected: "var(--red)", assigned: "var(--amber)", done: "var(--muted)",
};

function DecisionCard({ d }: { d: Decision }) {
  const qc = useQueryClient();
  const [assignTo, setAssignTo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const transition = useMutation({
    mutationFn: (a: { action: string; assignTo?: string }) => apiPost(`/api/decisions/${d.id}/transition`, a),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <span className="badge" style={{ background: "var(--navy-2)", color: "#fff" }}>{d.sbuName ?? "Group"}</span>
        <span className="badge" style={{ background: "#eef", color: STATUS_COLOR[d.status] }}>{d.status}</span>
        {d.owner && <span className="muted-line">owner: {d.owner}</span>}
        {d.decidedBy && <span className="muted-line">· decided by {d.decidedBy}</span>}
      </div>
      <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>{d.title}</h3>
      {d.whatHappened && <div style={{ fontSize: 13, marginBottom: 4 }}><b>What:</b> {d.whatHappened}</div>}
      {d.why && <div style={{ fontSize: 13, marginBottom: 4 }}><b>Why:</b> {d.why}</div>}
      {d.impact && <div style={{ fontSize: 13, marginBottom: 6 }}><b>Impact:</b> {d.impact}</div>}
      {d.options?.length ? (
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          <b>Options:</b>
          <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
            {d.options.map((o, i) => <li key={i}>{o.label}{o.description ? <span className="muted-line"> — {o.description}</span> : null}</li>)}
          </ul>
        </div>
      ) : null}
      {d.recommendation && <div style={{ fontSize: 13, marginBottom: 8 }}><b>Recommendation:</b> <span style={{ color: "var(--teal)" }}>{d.recommendation}</span></div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn" onClick={() => transition.mutate({ action: "approve" })}>Approve</button>
        <button className="btn" style={{ background: "var(--red)" }} onClick={() => transition.mutate({ action: "reject" })}>Reject</button>
        <input placeholder="assign to…" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={{ width: 140 }} />
        <button className="btn ghost" onClick={() => transition.mutate({ action: "assign", assignTo })}>Assign</button>
        <button className="btn ghost" onClick={() => transition.mutate({ action: "ask" })}>Ask</button>
      </div>
      {err && <div className="muted-line" style={{ color: "var(--red)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function WhatIf() {
  const { data: sbusData } = useQuery({ queryKey: ["sbus"], queryFn: () => apiFetch<{ sbus: SbuOption[] }>("/api/sbus") });
  const [code, setCode] = useState("ACCL");
  const [growth, setGrowth] = useState(30);
  const [result, setResult] = useState<any>(null);

  const run = useMutation({
    mutationFn: () => apiPost("/api/whatif", { code, brandGrowth: growth }),
    onSuccess: (r) => setResult(r),
  });

  const sbus = sbusData?.sbus ?? [];
  return (
    <div className="card">
      <h3>What-if simulator — market share</h3>
      <div className="muted-line" style={{ marginBottom: 10 }}>Project market share for a hypothetical brand revenue-growth rate.</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={code} onChange={(e) => setCode(e.target.value)}>{sbus.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        <input type="range" min={-20} max={120} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} style={{ width: 180 }} />
        <span className="mono" style={{ fontWeight: 700 }}>{growth}%</span>
        <button className="btn gold" onClick={() => run.mutate()}>Run</button>
      </div>
      {result && (
        <div className="kpis" style={{ marginTop: 12 }}>
          <div className="kpi"><div className="v">{result.currentShare}%</div><div className="l">Current share</div></div>
          <div className="kpi" style={{ borderLeftColor: "var(--teal)" }}><div className="v">{result.projectedShare}%</div><div className="l">Projected share @ {result.brandGrowth}% growth</div></div>
          <div className="kpi" style={{ borderLeftColor: "var(--composite)" }}><div className="v">{result.shareChangePp > 0 ? "+" : ""}{result.shareChangePp}pp</div><div className="l">Share change</div></div>
        </div>
      )}
      {result?.flags?.length ? (
        <div style={{ marginTop: 8 }}>{result.flags.map((f: any) => <span key={f.key} className="badge" style={{ background: "#fcebeb", color: "var(--red)", marginRight: 6 }}>⚠ {f.label}</span>)}</div>
      ) : null}
    </div>
  );
}

export default function Decisions() {
  const { data: alertsData } = useQuery({ queryKey: ["alerts"], queryFn: () => apiFetch<{ alerts: Alert[] }>("/api/alerts") });
  const { data: decisionsData } = useQuery({ queryKey: ["decisions"], queryFn: () => apiFetch<{ decisions: Decision[] }>("/api/decisions") });

  const alerts = alertsData?.alerts ?? [];
  const decisions = decisionsData?.decisions ?? [];
  const criticalCount = alerts.filter((a) => a.severity === "critical" || a.severity === "high").length;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Decision Support Center</h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Live alerts · decision cards (Approve / Reject / Assign / Ask) · what-if simulator.
      </div>

      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi"><div className="v">{alerts.length}</div><div className="l">Active alerts</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--red)" }}><div className="v">{criticalCount}</div><div className="l">High / critical</div></div>
        <div className="kpi" style={{ borderLeftColor: "var(--blue)" }}><div className="v">{decisions.filter((d) => d.status === "open").length}</div><div className="l">Open decisions</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Alerts ({alerts.length})</h3>
            {alerts.length === 0 ? <div className="muted-line">No alerts.</div> : (
              alerts.map((a) => (
                <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: SEV_COLOR[a.severity], color: "#fff" }}>{a.severity}</span>
                    <Link to={`/market/${a.sbuCode}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{a.sbuName}</Link>
                    {a.impactBdtCr != null && <span className="muted-line">~{a.impactBdtCr} Cr at risk</span>}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{a.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <WhatIf />
        </div>
      </div>

      <h2 style={{ fontSize: 16, margin: "8px 0 12px" }}>Decision cards ({decisions.length})</h2>
      {decisions.length === 0 ? <div className="muted-line">No decision cards.</div> : decisions.map((d) => <DecisionCard key={d.id} d={d} />)}
    </div>
  );
}
