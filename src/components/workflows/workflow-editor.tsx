"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { Select } from "@/components/ui/select";
import { useServiceAvailable } from "@/components/service/service-gate";
import { request, type Definition, type Step, type Workflow } from "@/lib/workflows/contracts";
import { StepEditor, stepChoices, stepSummary } from "./step-editor";
import { useWorkflowDraft } from "./use-workflow-draft";
import { RunDialog } from "@/components/runs/run-dialog";
import type { Run } from "@/lib/workflows/contracts";
import { ScheduleDialog } from "@/components/scheduling/schedule-dialog";

type Panel = { key: number; index?: number; insertAt?: number; kind?: Step["type"] };
function inputNames(steps: Step[]) {
  return [...new Set([...JSON.stringify(steps).matchAll(/\{\{([A-Za-z][A-Za-z0-9_]{0,49})\}\}/g)].map((match) => match[1]!))];
}

export function WorkflowEditor({ workflow, windowsAvailable, onBack, onRunStarted, onStepSaved }: { workflow: Workflow; windowsAvailable: boolean; onBack: () => void; onRunStarted: (run: Run) => void; onStepSaved?: () => void }) {
  const save = useWorkflowDraft(workflow);
  const available = useServiceAvailable();
  const [panel, setPanel] = useState<Panel>();
  const slot = useRef<number | null>(null);
  const [details, setDetails] = useState(false);
  const [scheduleWorkflow, setScheduleWorkflow] = useState<Workflow>();
  const [runWorkflow, setRunWorkflow] = useState<Workflow>();
  const [scheduleError, setScheduleError] = useState("");
  const scheduleButton = useRef<HTMLButtonElement>(null);
  const [detailsName, setDetailsName] = useState(workflow.definition.name);
  const [detailsError, setDetailsError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const previous = useRef(save.status);
  const panelKey = useRef(0);
  const settingsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (panel && window.matchMedia("(max-width: 760px)").matches) settingsRef.current?.scrollIntoView({ block: "start" });
  }, [panel]);
  useEffect(() => {
    if (save.status === "saved" && previous.current !== "saved") {
      setShowSaved(true);
      const timer = window.setTimeout(() => setShowSaved(false), 2500);
      previous.current = save.status;
      return () => window.clearTimeout(timer);
    }
    if (save.status !== "saved") setShowSaved(false);
    previous.current = save.status;
  }, [save.status]);
  function replaceSteps(steps: Step[]) {
    save.update((current) => {
      const previouslyReferenced = inputNames(current.steps);
      const explicitInputs = current.inputs.filter((name) => !previouslyReferenced.includes(name));
      return { ...current, steps, inputs: [...new Set([...explicitInputs, ...inputNames(steps)])] };
    });
  }
  function openPanel(index?: number, kind?: Step["type"], insertAt?: number) {
    slot.current = index ?? null;
    setPanel({ key: ++panelKey.current, index, insertAt, kind });
  }
  function changeStep(step: Step) {
    const steps = [...save.draft.steps];
    if (slot.current === null) {
      if (steps.length >= 30) return;
      slot.current = panel?.insertAt ?? steps.length;
      steps.splice(slot.current, 0, step);
    } else if (slot.current >= 0 && slot.current < steps.length) steps[slot.current] = step;
    else return;
    replaceSteps(steps);
  }
  async function saveStep() {
    if (await save.flush()) { setPanel(undefined); onStepSaved?.(); }
  }
  async function back() {
    if (leaving) return;
    if (save.conflict) { setConfirmDiscard(true); return; }
    setLeaving(true);
    const saved = await save.flush();
    setLeaving(false);
    if (saved) onBack();
  }
  async function openRun() {
    setScheduleError("");
    if (!await save.flush()) return;
    try { setRunWorkflow(await request<Workflow>(`workflows/${workflow.id}`)); }
    catch { setScheduleError("Could not start the workflow. Please try again."); }
  }
  async function openSchedule() {
    setScheduleError("");
    if (!await save.flush()) return;
    try { setScheduleWorkflow(await request<Workflow>(`workflows/${workflow.id}`)); }
    catch { setScheduleError("Could not open scheduling. Please try again."); }
  }
  function changeTarget(value: string) {
    const next = value as "browser" | "windows";
    const incompatible = save.draft.steps.some((step) => step.type === "scroll" && (next === "browser" ? "wheelTicks" in step : "pixels" in step));
    if (incompatible) { setDetailsError("Remove incompatible scroll steps before changing the VM type."); return; }
    setDetailsError("");
    save.update((current) => ({ ...current, executionTarget: next }));
  }
  function closeDetails(next: boolean) {
    if (!next && !detailsName.trim()) { setDetailsError("Enter a workflow name."); return; }
    setDetails(next);
  }
  function moveStep(from: number, to: number) {
    if (to < 0 || to >= save.draft.steps.length) return;
    const steps = [...save.draft.steps]; const [step] = steps.splice(from, 1); if (!step) return; steps.splice(to, 0, step);
    setPanel(undefined); replaceSteps(steps);
  }
  const displayStatus = save.status === "saving" ? "Saving…" : save.status === "pending" ? "Unsaved changes" : save.status === "error" ? "Not saved" : showSaved ? "Saved" : "";
  return <div className="editor-page">
    <header className="editor-header">
      <div className="editor-leading"><button className="editor-back" type="button" aria-label="Back to workflows" disabled={leaving} onClick={() => void back()}><ArrowLeft size={20} /></button>
      <div className="editor-title"><h1>{save.draft.name}</h1><span role="status">{displayStatus}</span></div></div>
      <button ref={scheduleButton} type="button" className="editor-schedule" aria-label="Schedule workflow" title="Schedule workflow" disabled={!save.draft.steps.length || leaving} onClick={() => void openSchedule()}><CalendarClock size={19}/></button>
      <div className="editor-controls"><div className="editor-header-actions"><button type="button" className="editor-quiet" disabled={!save.canUndo || leaving} onClick={() => { setPanel(undefined); save.undo(); }}>Undo</button><button type="button" className="editor-quiet" disabled={!save.canRedo || leaving} onClick={() => { setPanel(undefined); save.redo(); }}>Redo</button><button type="button" className="editor-quiet" onClick={() => { setDetailsName(save.draft.name); setDetailsError(""); setDetails(true); }}>Details</button></div>
      <div className="editor-action-menu"><Dropdown label="Actions" accessibleLabel="Workflow actions" items={[
        { label: "Undo", disabled: !save.canUndo || leaving, onSelect: () => { setPanel(undefined); save.undo(); } },
        { label: "Redo", disabled: !save.canRedo || leaving, onSelect: () => { setPanel(undefined); save.redo(); } },
        { label: "Details", onSelect: () => { setDetailsName(save.draft.name); setDetailsError(""); setDetails(true); } },
      ]}/></div>
      <button type="button" className="editor-play" aria-label="Run workflow" title="Run workflow" disabled={!save.draft.steps.length || leaving} onClick={() => void openRun()}><Play size={17} fill="currentColor" aria-hidden="true" /></button></div>
    </header>
    {scheduleError && <div className="editor-alert" role="alert">{scheduleError}</div>}
    {save.message && <div className="editor-alert" role="alert">{save.message} {!save.conflict && <button type="button" onClick={() => void save.flush()}>Try again</button>}</div>}
    <div className={`editor-layout${panel ? " editor-layout--panel" : ""}`}>
      <aside className="editor-steps"><h2>Steps</h2><p>Click a step to add it.</p>{stepChoices.map((choice) => <button type="button" key={choice.type} disabled={save.draft.steps.length >= 30} onClick={() => openPanel(undefined, choice.type)}><span>{choice.icon}</span>{choice.title}</button>)}</aside>
      <div className="editor-canvas">
        <div className="editor-add"><Dropdown label="Add step" disabled={save.draft.steps.length >= 30} items={stepChoices.map((choice) => ({ label: choice.title, onSelect: () => openPanel(undefined, choice.type) }))} /></div>
        <div className="editor-chain"><span className="editor-end">Start</span><div className="editor-line" />
          {save.draft.steps.map((step, index) => <div className="editor-chain-item" key={index} draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-openly-step", String(index)); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-openly-step")) event.preventDefault(); }} onDrop={(event) => { if (!event.dataTransfer.types.includes("application/x-openly-step")) return; event.preventDefault(); const from = Number(event.dataTransfer.getData("application/x-openly-step")); if (Number.isInteger(from) && from >= 0 && from < save.draft.steps.length && from !== index) moveStep(from, index); }}>
            <button type="button" className="editor-insert" aria-label={`Insert step before step ${index + 1}`} disabled={save.draft.steps.length >= 30} onClick={() => openPanel(undefined, undefined, index)}>+</button>
            <div className="editor-node"><button type="button" className="editor-node-main" onClick={() => openPanel(index)}><span className="editor-node-icon">{stepChoices.find((choice) => choice.type === step.type)?.icon}</span><span><strong>{stepChoices.find((choice) => choice.type === step.type)?.title}</strong><small>{stepSummary(step)}</small></span></button><button type="button" className="editor-remove" aria-label={`Remove step ${index + 1}`} onClick={() => { setPanel(undefined); replaceSteps(save.draft.steps.filter((_, i) => i !== index)); }}>×</button></div>
            <div className="editor-line" />
          </div>)}
          <button className="editor-plus" type="button" aria-label="Add a step" disabled={save.draft.steps.length >= 30} onClick={() => openPanel()}>+</button><div className="editor-line" /><span className="editor-end">End</span>
        </div>
      </div>
      {panel && <aside ref={settingsRef} className="editor-settings"><StepEditor key={panel.key} initial={panel.index === undefined ? undefined : save.draft.steps[panel.index]} initialKind={panel.kind} target={save.draft.executionTarget} onChange={changeStep} onClose={() => setPanel(undefined)} onSave={saveStep} /></aside>}
    </div>
    {runWorkflow && available && <RunDialog workflow={runWorkflow} onClose={() => setRunWorkflow(undefined)} onStarted={onRunStarted} />}
    {scheduleWorkflow && <ScheduleDialog workflow={scheduleWorkflow} open={available} onOpenChange={(next) => { if (!next) setScheduleWorkflow(undefined); }} returnFocus={() => scheduleButton.current?.focus()} />}
    <Dialog open={details && available} onOpenChange={closeDetails} title="Workflow details" description="Edit the workflow’s name, description, and VM type.">
      <div className="workflow-fields">
        <label>Name<input maxLength={120} value={detailsName} onChange={(event) => { const value = event.target.value; setDetailsName(value); if (value.trim()) { setDetailsError(""); save.update((current) => ({ ...current, name: value.trim() })); } }} /></label>
        <label>Description<textarea maxLength={1000} value={save.draft.description} onChange={(event) => { const value = event.target.value; save.update((current) => ({ ...current, description: value })); }} /></label>
        <label>VM type<Select label="VM type" value={save.draft.executionTarget ?? "browser"} onChange={changeTarget} options={[{ value: "browser", label: "Browser VM" }, { value: "windows", label: "Computer VM", disabled: !windowsAvailable && save.draft.executionTarget !== "windows" }]} /></label>
        {detailsError && <p role="alert" className="step-error">{detailsError}</p>}
      </div>
    </Dialog>
    <Dialog open={confirmDiscard && available} onOpenChange={setConfirmDiscard} title="Discard unsaved changes?" description="Your unsaved changes will be lost."><div className="workflow-actions"><Button variant="quiet" onClick={() => setConfirmDiscard(false)}>Keep editing</Button><Button onClick={onBack}>Discard changes</Button></div></Dialog>
  </div>;
}
