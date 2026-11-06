"use client";
import { useEffect, useRef, useState } from "react";
import { request, type Run } from "@/lib/workflows/contracts";
import { statusLabel, statusTone } from "./run-status";

function timestamp(value?: string) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}
function result(run: Run) {
  return run.result && typeof run.result === "object" && "message" in run.result && typeof run.result.message === "string" ? run.result.message : "—";
}
export function RunHistory({ active, onOpen }: { active: boolean; onOpen: (run: Run) => void }) {
  const [runs, setRuns] = useState<Run[]>();
  const [error, setError] = useState("");
  const loaded = useRef(false);
  useEffect(() => {
    if (!active && loaded.current) return;
    let current = true;
    setError("");
    request<Run[]>("runs")
      .then((value) => { if (current) { loaded.current = true; setRuns([...value].sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""))); } })
      .catch(() => { if (current) setError("Could not load run history."); });
    return () => { current = false; };
  }, [active]);
  return <>
    <header className="home-heading"><h1>Run history</h1></header>
    <section className="home-section">
      <div className="home-section-heading"><h2>All runs</h2></div>
      {error ? <p className="home-message" role="alert">{error}</p> : !runs ? <p className="home-message">Loading runs…</p> : <div className="home-table-wrap"><table className="home-table"><thead><tr><th>Workflow</th><th>Status</th><th>Result</th><th>When</th></tr></thead><tbody>
        {runs.map((run) => <tr key={run.id}><td><button type="button" className="home-workflow" onClick={() => onOpen(run)}>{run.workflowName || "Workflow"}</button>{run.example && <span className="home-description">Recorded example</span>}</td><td><span className={`home-status run-status--${statusTone(run.status)}`}><i className={`run-status-dot--${statusTone(run.status)}`} aria-hidden="true" />{statusLabel(run.status)}</span></td><td>{result(run)}</td><td>{timestamp(run.createdAt)}</td></tr>)}
        {!runs.length && <tr><td colSpan={4}>Your runs will appear here.</td></tr>}
      </tbody></table></div>}
    </section>
  </>;
}
