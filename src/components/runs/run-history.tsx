"use client";
import { useEffect, useState } from "react";
import { request, type Run } from "@/lib/workflows/contracts";
function status(value: string) {
  if (value === "completed") return { label: "Completed", tone: "completed" };
  if (value === "failed") return { label: "Failed", tone: "failed" };
  if (["cancelled", "interrupted", "stopped"].includes(value)) return { label: "Stopped", tone: "stopped" };
  if (value === "outcome_unknown") return { label: "Outcome unknown", tone: "outcome-unknown" };
  return { label: "Running", tone: "running" };
}
export function RunHistory({ onOpen, workflow }: { onOpen: (run: Run) => void; workflow?: { id: string; name: string } }) {
  const [runs, setRuns] = useState<Run[]>();
  const [error, setError] = useState("");
  useEffect(() => { let active = true; request<Run[]>(workflow ? `workflows/${workflow.id}/runs` : "runs").then((value) => { if (active) setRuns(value); }).catch(() => { if (active) setError("Could not load run history."); }); return () => { active = false; }; }, [workflow?.id]);
  return <section className="run-history"><h1>{workflow ? `${workflow.name} — Run history` : "Run history"}</h1>{error ? <p role="alert">{error}</p> : !runs ? <p>Loading runs…</p> : !runs.length ? <p>Your runs will appear here.</p> : <div className="home-table-wrap"><table className="home-table"><thead><tr><th>Workflow</th><th>Status</th><th>When</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td><button className="home-workflow" type="button" onClick={() => onOpen(run)}>{run.workflowName || workflow?.name || "Workflow"}</button></td><td><span className={`home-status home-status--${status(run.status).tone}`}><i aria-hidden="true" />{status(run.status).label}</span></td><td>{run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>}</section>;
}
