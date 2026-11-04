"use client";

import { useEffect, useState } from "react";
import { request, type Run, type Workflow } from "@/lib/workflows/contracts";
import { stepChoices, stepSummary } from "@/components/workflows/step-editor";

type Event = { timestamp: string; kind: string; status: string; stepIndex?: number; stepType?: string; action?: string; durationMs?: number; usage?: { inputTokens: number; outputTokens: number } };
const terminal = new Set(["completed", "failed", "cancelled", "interrupted", "outcome_unknown"]);
export function RunView({ initial, onBack }: { initial: Run; onBack: () => void }) {
  const [run, setRun] = useState(initial);
  const [workflow, setWorkflow] = useState<Workflow>();
  const [events, setEvents] = useState<Event[]>();
  const [error, setError] = useState("");
  const [logsError, setLogsError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; if (run.workflowId && run.workflowVersion) void request<Workflow>(`workflows/${run.workflowId}/versions/${run.workflowVersion}`).then((value) => { if (active) setWorkflow(value); }).catch(() => { if (active) setError("Could not load the workflow version."); }); return () => { active = false; }; }, [run.workflowId, run.workflowVersion]);
  useEffect(() => { let active = true; let timer: number | undefined; async function refresh() { try { const next = await request<Run>(`runs/${initial.id}`); if (!active) return; setRun(next); if (!terminal.has(next.status) || next.recordingStatus === "pending") timer = window.setTimeout(refresh, 1500); } catch { if (active) { setError("Run status is temporarily unavailable."); timer = window.setTimeout(refresh, 5000); } } } void refresh(); return () => { active = false; if (timer) window.clearTimeout(timer); }; }, [initial.id]);
  useEffect(() => { let active = true; let timer: number | undefined; async function refresh() { try { const logs = await request<Event[]>(`runs/${initial.id}/events`); if (active) { setEvents(logs); setLogsError(false); } } catch { if (active) setLogsError(true); } if (active && !terminal.has(run.status)) timer = window.setTimeout(refresh, 1500); } void refresh(); return () => { active = false; if (timer) window.clearTimeout(timer); }; }, [initial.id, run.status]);
  async function stop() { setBusy(true); try { await request(`runs/${run.id}/cancel`, { body: {} }); } catch { setError("Could not stop the run."); } finally { setBusy(false); } }
  return <div className="run-page">
    <header className="run-header"><button type="button" onClick={onBack}>← Back</button><h1>{run.workflowName || workflow?.definition.name || "Workflow run"}</h1><span>{run.status.replaceAll("_", " ")}</span></header>
    <main className="run-layout">
      <section className="run-progress">
        <h2>Workflow progress</h2>
        {error && <p role="alert">{error}</p>}
        <div className="run-canvas">
          {workflow ? <div className="run-chain">
            <span className="editor-end">Start</span><div className="editor-line" aria-hidden="true" />
            <ol className="run-steps">{workflow.definition.steps.map((step, index) => {
              const choice = stepChoices.find((item) => item.type === step.type);
              const evidence = run.steps?.[index];
              const state = evidence?.status ?? "pending";
              return <li className="run-step-group" key={index}>
                <div className="run-step-card">
                  <span className="editor-node-icon" aria-hidden="true">{choice?.icon ?? "•"}</span>
                  <div className="run-step-content"><strong>{choice?.title ?? step.type}</strong><p>{stepSummary(step)}</p>{evidence?.message && <p className="run-step-error">{evidence.message}</p>}</div>
                  <span className={`run-step-status run-step-status--${state}`}>{state.replaceAll("_", " ")}</span>
                </div>
                <div className="editor-line" aria-hidden="true" />
              </li>;
            })}</ol>
            <span className="editor-end">End</span>
          </div> : <p className="run-canvas-message">{error ? "Workflow steps are unavailable." : "Loading workflow steps…"}</p>}
        </div>
      </section>
      <aside className="run-side">
        <h2>{terminal.has(run.status) ? "VM screen" : "Live VM"}</h2>
        {!terminal.has(run.status) ? <>{run.liveViewUrl ? <iframe title="Live VM" src={run.liveViewUrl} referrerPolicy="no-referrer" /> : <p>Connecting to the VM…</p>}<button className="button" type="button" disabled={busy || run.status === "cancelling"} onClick={() => void stop()}>Stop run</button></> : run.recordingStatus === "saved" ? <video controls preload="metadata" src={`/api/runs/${run.id}/recording`} /> : <p>{run.recordingStatus === "pending" ? "Saving recording…" : run.recordingStatus === "failed" ? "The recording could not be saved." : "No recording available."}</p>}
        <details><summary>Logs</summary>{logsError ? <p>Logs are temporarily unavailable.</p> : events === undefined ? <p>Loading logs…</p> : !events.length ? <p>No logs available for this run.</p> : <ol className="run-logs">{[...events].reverse().map((event, index) => <li key={`${event.timestamp}-${index}`}><strong>{event.kind === "step" ? `${event.stepType ?? "Step"}: ${event.status}` : `${event.action ?? event.kind}: ${event.status}`}</strong><time>{new Date(event.timestamp).toLocaleTimeString()}</time><details><summary>View JSON</summary><pre>{JSON.stringify(event, null, 2)}</pre></details></li>)}</ol>}</details>
      </aside>
    </main>
  </div>;
}
