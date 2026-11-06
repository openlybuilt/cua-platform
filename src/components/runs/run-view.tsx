"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { request, type Run, type Workflow } from "@/lib/workflows/contracts";
import { RunLoadingState } from "./run-loading-state";
import { isRunTerminal, statusLabel, statusTone } from "./run-status";
import { stepChoices, stepSummary } from "@/components/workflows/step-editor";

type Event = { timestamp: string; kind: string; status: string; stepIndex?: number; stepType?: string; action?: string; durationMs?: number; usage?: { inputTokens: number; outputTokens: number } };
const exampleEvents: Array<Event & { offset: number }> = [
  { offset: 1.434, timestamp: "2026-11-06T21:27:27.102Z", kind: "step", stepIndex: 0, stepType: "navigate", status: "completed", durationMs: 1434 },
  { offset: 9.805, timestamp: "2026-11-06T21:27:35.473Z", kind: "model", stepIndex: 1, status: "completed", durationMs: 8016, usage: { inputTokens: 3060, outputTokens: 94 } },
  { offset: 12.704, timestamp: "2026-11-06T21:27:38.372Z", kind: "model", stepIndex: 1, status: "completed", durationMs: 2411, usage: { inputTokens: 3096, outputTokens: 85 } },
  { offset: 15.258, timestamp: "2026-11-06T21:27:40.926Z", kind: "action", stepIndex: 1, action: "click", status: "completed", durationMs: 2554 },
  { offset: 15.702, timestamp: "2026-11-06T21:27:41.370Z", kind: "step", stepIndex: 1, stepType: "type", status: "completed", durationMs: 14263 },
];
export function RunView({ initial, onBack, onRunUpdate, example }: { initial: Run; onBack: () => void; onRunUpdate?: (run: Run) => void; example?: { workflow: Workflow; history?: boolean } }) {
  const [run, setRun] = useState<Run>(() => example?.history ? { ...initial, status: "completed", steps: example.workflow.definition.steps.map(() => ({ status: "completed" })) } : initial);
  const [now, setNow] = useState(() => Date.now());
  const [workflow, setWorkflow] = useState<Workflow | undefined>(example?.workflow);
  const [events, setEvents] = useState<Event[] | undefined>(example?.history ? exampleEvents.map(({ offset: _offset, ...event }) => event) : example ? [] : undefined);
  const [error, setError] = useState("");
  const [logsError, setLogsError] = useState(false);
  const [logsOpen, setLogsOpen] = useState(true);
  const [logQuery, setLogQuery] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (example) return; let active = true; if (run.workflowId && run.workflowVersion) void request<Workflow>(`workflows/${run.workflowId}/versions/${run.workflowVersion}`).then((value) => { if (active) setWorkflow(value); }).catch(() => { if (active) setError("Could not load the workflow version."); }); return () => { active = false; }; }, [run.workflowId, run.workflowVersion, example]);
  useEffect(() => { if (example) return; let active = true; let timer: number | undefined; async function refresh() { try { const next = await request<Run>(`runs/${initial.id}`); if (!active) return; setRun(next); onRunUpdate?.(next); if (!isRunTerminal(next.status) || next.recordingStatus === "pending") timer = window.setTimeout(refresh, 1500); } catch { if (active) { setError("Run status is temporarily unavailable."); timer = window.setTimeout(refresh, 5000); } } } void refresh(); return () => { active = false; if (timer) window.clearTimeout(timer); }; }, [initial.id, onRunUpdate, example]);
  useEffect(() => { if (example) return; let active = true; let timer: number | undefined; async function refresh() { try { const logs = await request<Event[]>(`runs/${initial.id}/events`); if (active) { setEvents(logs); setLogsError(false); } } catch { if (active) setLogsError(true); } if (active && !isRunTerminal(run.status)) timer = window.setTimeout(refresh, 1500); } void refresh(); return () => { active = false; if (timer) window.clearTimeout(timer); }; }, [initial.id, run.status, example]);
  useEffect(() => {
    if (isRunTerminal(run.status)) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [run.id, run.status]);
  const startedAt = run.createdAt ? Date.parse(run.createdAt) : NaN;
  const seconds = Number.isFinite(startedAt) ? Math.max(0, Math.floor((now - startedAt) / 1000)) : null;
  const elapsed = seconds === null ? "" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const query = logQuery.trim().toLowerCase();
  const matchingEvents = events?.filter((event) => {
    const time = Number.isNaN(Date.parse(event.timestamp)) ? "" : new Date(event.timestamp).toLocaleTimeString();
    return `${JSON.stringify(event)} ${statusLabel(event.status)} ${time}`.toLowerCase().includes(query);
  });
  function updateExample(seconds: number, finished = false) {
    setEvents(exampleEvents.filter((event) => event.offset <= seconds).map(({ offset: _offset, ...event }) => event));
    const next: Run = { ...initial, status: finished ? "completed" : "running", steps: [{ status: seconds >= 1.434 ? "completed" : "running" }, { status: finished || seconds >= 15.702 ? "completed" : seconds >= 1.439 ? "running" : "pending" }] };
    setRun(next);
    if (finished) onRunUpdate?.(next);
  }
  async function stop() { setBusy(true); try { await request(`runs/${run.id}/cancel`, { body: {} }); } catch { setError("Could not stop the run."); } finally { setBusy(false); } }
  return <div className="run-page">
    <header className="run-header"><button type="button" onClick={onBack}>← Back</button><h1>{run.workflowName || workflow?.definition.name || "Workflow run"}</h1>{isRunTerminal(run.status) ? <span className={`run-status--${statusTone(run.status)}`}>{statusLabel(run.status)}</span> : <RunLoadingState status={run.status} elapsed={elapsed} />}</header>
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
                  <div className="run-step-content"><strong>{choice?.title ?? step.type}</strong><p>{stepSummary(step)}</p>{evidence?.message && <p className={`run-step-message--${statusTone(state)}`}>{evidence.message}</p>}</div>
                  <span className={`run-step-status run-status--${statusTone(state)}`}>{statusLabel(state).toLowerCase()}</span>
                </div>
                <div className="editor-line" aria-hidden="true" />
              </li>;
            })}</ol>
            <span className="editor-end">End</span>
          </div> : <p className="run-canvas-message">{error ? "Workflow steps are unavailable." : "Loading workflow steps…"}</p>}
        </div>
      </section>
      <aside className="run-side">
        <div className="run-vm"><h2>{example ? example.history ? "Recording" : "Live VM" : isRunTerminal(run.status) ? "VM screen" : "Live VM"}</h2>
        {example ? <><video controls autoPlay={!example.history} muted={!example.history} playsInline preload="metadata" src="/guide-example.mp4" onTimeUpdate={(event) => { if (!example.history) updateExample(event.currentTarget.currentTime); }} onEnded={() => { if (!example.history) updateExample(Infinity, true); }} onError={() => { setError(example.history ? "The example recording could not be played." : "The example recording could not be played. You can continue the guide."); if (!example.history) updateExample(Infinity, true); }} /></> : !isRunTerminal(run.status) ? <>{run.liveViewUrl ? <iframe title="Live VM" src={run.liveViewUrl} referrerPolicy="no-referrer" /> : <p>Connecting to the VM…</p>}<button className="button" type="button" disabled={busy || run.status === "cancelling"} onClick={() => void stop()}>Stop run</button></> : run.recordingStatus === "saved" ? <video controls preload="metadata" src={`/api/runs/${run.id}/recording`} /> : <p>{run.recordingStatus === "pending" ? "Saving recording…" : run.recordingStatus === "failed" ? "The recording could not be saved." : "No recording available."}</p>}</div>
        <details className="run-log-panel" open={logsOpen} onToggle={(event) => setLogsOpen(event.currentTarget.open)}>
          <summary className="run-log-heading"><span>Logs</span><ChevronDown size={16} aria-hidden="true" /></summary>
          <label className="run-log-search"><Search size={14} aria-hidden="true" /><input type="search" aria-label="Search logs" placeholder="Search logs" value={logQuery} onChange={(event) => setLogQuery(event.target.value)} /></label>
          {logsError ? <p className="run-log-message">Logs are temporarily unavailable.</p> : events === undefined ? <p className="run-log-message">Loading logs…</p> : !events.length ? <p className="run-log-message">No logs available for this run.</p> : !matchingEvents?.length ? <p className="run-log-message">No logs match your search.</p> : <ol className="run-logs">{[...matchingEvents].reverse().map((event, index) => <li key={`${event.timestamp}-${index}`}><div className="run-log-row"><strong>{event.kind === "step" ? event.stepType ?? "Step" : event.action ?? event.kind}: <span className={`run-status--${statusTone(event.status)}`}>{statusLabel(event.status).toLowerCase()}</span></strong><time dateTime={event.timestamp}>{Number.isNaN(Date.parse(event.timestamp)) ? "" : new Date(event.timestamp).toLocaleTimeString()}</time></div><details className="run-log-json"><summary>View JSON <ChevronDown size={12} aria-hidden="true" /></summary><pre>{JSON.stringify(event, null, 2)}</pre></details></li>)}</ol>}
        </details>
      </aside>
    </main>
  </div>;
}
