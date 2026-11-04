"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { request, type Run } from "@/lib/workflows/contracts";

function status(value: string) {
  if (value === "completed") return { label: "Completed", tone: "completed" };
  if (value === "failed") return { label: "Failed", tone: "failed" };
  if (["cancelled", "interrupted", "stopped"].includes(value)) return { label: "Stopped", tone: "stopped" };
  if (value === "outcome_unknown") return { label: "Outcome unknown", tone: "outcome-unknown" };
  return { label: "Running", tone: "running" };
}
function timestamp(value?: string) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Unknown time";
}
export function RunHistory({ onOpen, onBack, workflow }: { onOpen: (run: Run) => void; onBack: () => void; workflow?: { id: string; name: string } }) {
  const [runs, setRuns] = useState<Run[]>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setRuns(undefined); setError("");
    request<Run[]>(workflow ? `workflows/${workflow.id}/runs` : "runs")
      .then((value) => { if (active) setRuns(value); })
      .catch(() => { if (active) setError("Could not load run history."); });
    return () => { active = false; };
  }, [workflow?.id]);
  return <main className="run-history-page">
    <header className="run-history-header">
      <button className="editor-back" type="button" aria-label="Back to workflows" onClick={onBack}><ArrowLeft size={20} aria-hidden="true" /></button>
      <h1>Run history</h1><span aria-hidden="true" />
    </header>
    <section className="run-history-canvas" aria-label="Runs">
      {error ? <p className="run-history-message" role="alert">{error}</p> : !runs ? <p className="run-history-message">Loading runs…</p> : !runs.length ? <p className="run-history-message">Your runs will appear here.</p> : <div className="run-history-cards">{runs.map((run) => <button className="run-history-card" type="button" key={run.id} onClick={() => onOpen(run)}>
        <strong>{timestamp(run.createdAt)}</strong>
        <span className={`run-history-status run-history-status--${status(run.status).tone}`}>Status: {status(run.status).label.toLowerCase()}</span>
        <small>{run.workflowName || workflow?.name || "Workflow"}</small>
      </button>)}</div>}
    </section>
  </main>;
}
