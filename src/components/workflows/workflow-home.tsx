"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { request, type Run, type Workflow } from "@/lib/workflows/contracts";

function date(value?: string) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}
function status(value: string) {
  if (value === "failed") return "Failed";
  if (value === "completed") return "Completed";
  if (value === "outcome_unknown") return "Outcome unknown";
  if (["cancelled", "stopped", "interrupted"].includes(value)) return "Stopped";
  return "Running";
}
function result(run: Run) {
  const value = run.result;
  return value && typeof value === "object" && "message" in value && typeof value.message === "string" ? value.message : "—";
}

export function WorkflowHome({ onCreate, onOpen, onOpenRun }: { onCreate: () => void; onOpen: (workflow: Workflow) => void; onOpenRun: (run: Run) => void }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([request<Workflow[]>("workflows"), request<Run[]>("runs")]).then(([workflows, runs]) => {
      if (!active) return;
      setWorkflows(workflows);
      setRuns([...runs].sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "")));
    }).catch((problem: unknown) => { if (active) setError(problem instanceof Error ? problem.message : "Could not load workflows."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  return <>
    <header className="home-heading"><h1>Workflows</h1><button type="button" className="home-create" onClick={onCreate}><Plus size={17} aria-hidden="true" />Create workflow</button></header>
    {loading ? <p className="home-message">Loading workspace…</p> : error ? <p role="alert" className="home-message">{error} <button type="button" className="home-link" onClick={() => setAttempt((value) => value + 1)}>Try again</button></p> : <>
      <section className="home-section"><div className="home-section-heading"><h2>Recent runs</h2></div>
        <div className="home-table-wrap"><table className="home-table"><thead><tr><th>Workflow</th><th>Status</th><th>Result</th><th>When</th></tr></thead><tbody>
          {runs.slice(0, 3).map((run) => <tr key={run.id}><td><button type="button" className="home-workflow" onClick={() => onOpenRun(run)}>{run.workflowName || "Workflow"}</button></td><td><span className={`home-status home-status--${status(run.status).toLowerCase().replaceAll(" ", "-")}`}><i aria-hidden="true" />{status(run.status)}</span></td><td>{result(run)}</td><td>{date(run.createdAt)}</td></tr>)}
          {!runs.length && <tr><td colSpan={4}>Your runs will appear here.</td></tr>}
        </tbody></table></div>
      </section>
      <section className="home-section"><div className="home-section-heading"><h2>All workflows</h2><span>{workflows.length} {workflows.length === 1 ? "workflow" : "workflows"}</span></div>
        <div className="home-table-wrap"><table className="home-table home-workflows"><thead><tr><th>Workflow</th><th>Last activity</th></tr></thead><tbody>
          {workflows.map((workflow) => { const latest = runs.find((run) => run.workflowId === workflow.id); return <tr key={workflow.id}><td><button type="button" className="home-workflow" onClick={() => onOpen(workflow)}>{workflow.definition.name}</button><span className="home-description">{workflow.definition.description || `${workflow.definition.steps.length} steps`}</span></td><td>{latest ? date(latest.createdAt) : "—"}</td></tr>; })}
          {!workflows.length && <tr><td colSpan={2}>You haven’t created a workflow yet.</td></tr>}
        </tbody></table></div>
      </section>
    </>}
  </>;
}
