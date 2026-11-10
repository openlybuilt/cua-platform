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
import { useProviderCapabilities, defaultProvider, providerName, vmName, type VMType } from "./use-provider-capabilities";
import { RunDialog } from "@/components/runs/run-dialog";
import type { Run } from "@/lib/workflows/contracts";
import { ScheduleDialog } from "@/components/scheduling/schedule-dialog";
import { PrewarmEditor } from "./prewarm-editor";

type Panel = { key: number; index?: number; insertAt?: number; kind?: Step["type"] };
function inputNames(steps: Step[]) {
  return [...new Set([...JSON.stringify(steps).matchAll(/\{\{([A-Za-z][A-Za-z0-9_]{0,49})\}\}/g)].map((match) => match[1]!))];
}

export function WorkflowEditor({ workflow, windowsAvailable, onBack, onRunStarted, onStepSaved, onStepChange, onRunDirect }: { workflow: Workflow; windowsAvailable: boolean; onBack: () => void; onRunStarted: (run: Run) => void; onStepSaved?: (definition: Definition) => void; onStepChange?: (step: Step) => void; onRunDirect?: (workflow: Workflow) => Promise<void> }) {
  const save = useWorkflowDraft(workflow);
  const { providers, status: providerStatus } = useProviderCapabilities();
  const currentTarget = save.draft.executionTarget ?? "browser";
  const currentProvider = save.draft.provider ?? defaultProvider(currentTarget);
  const selectedProvider = providers.find((item) => item.id === currentProvider);
  const available = useServiceAvailable();
  const [panel, setPanel] = useState<Panel>();
  const [editorTab, setEditorTab] = useState<"workflow" | "prewarm">("workflow");
  const [prewarmDirty, setPrewarmDirty] = useState(false);
  const [prewarmPlaceholders, setPrewarmPlaceholders] = useState<{ name: string; secret: boolean }[]>([]);
  const [prewarmLoading, setPrewarmLoading] = useState(true);
  const [prewarmError, setPrewarmError] = useState("");
  useEffect(() => {
    if (editorTab !== "prewarm") return;
    let active = true;
    setPrewarmLoading(true);
    request<{ name: string; secret: boolean }[]>("placeholders").then(value => { if (active) { setPrewarmPlaceholders(value); setPrewarmError(""); } }).catch(() => { if (active) setPrewarmError("Could not load placeholders."); }).finally(() => { if (active) setPrewarmLoading(false); });
    return () => { active = false; };
  }, [editorTab]);
  useEffect(() => {
    if (!prewarmDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [prewarmDirty]);
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
    onStepChange?.(step);
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
    if (await save.flush()) { setPanel(undefined); onStepSaved?.(save.draft); }
  }
  async function back() {
    if (leaving) return;
    if (save.conflict || prewarmDirty) { setConfirmDiscard(true); return; }
    setLeaving(true);
    const saved = await save.flush();
    setLeaving(false);
    if (saved) onBack();
  }
  async function openRun() {
    if (prewarmDirty) { setScheduleError("Save or discard your prewarming changes first."); return; }
    setScheduleError("");
    if (!await save.flush()) return;
    try { const current = await request<Workflow>(`workflows/${workflow.id}`); if (onRunDirect) await onRunDirect(current); else setRunWorkflow(current); }
    catch (problem) { setScheduleError(problem instanceof Error ? problem.message : "Could not start the workflow. Please try again."); }
  }
  async function openSchedule() {
    if (prewarmDirty) { setScheduleError("Save or discard your prewarming changes first."); return; }
    setScheduleError("");
    if (!await save.flush()) return;
    try { setScheduleWorkflow(await request<Workflow>(`workflows/${workflow.id}`)); }
    catch { setScheduleError("Could not open scheduling. Please try again."); }
  }
  function selectEnvironment(provider: string, target: VMType) {
    if ((save.draft.prewarm?.length || prewarmDirty) && (target !== "browser" || provider !== "onkernel")) { setDetailsError("Remove prewarming before changing to this provider or VM type."); return; }
    const incompatible = save.draft.steps.some((step) => step.type === "scroll" && (target === "browser" ? "wheelTicks" in step : "pixels" in step));
    if (incompatible) { setDetailsError("Remove incompatible scroll steps before changing the VM type."); return; }
    setDetailsError("");
    save.update((current) => ({ ...current, provider, executionTarget: target }));
  }
  function changeProvider(provider: string) {
    const supported = providers.find((item) => item.id === provider)?.executionTargets ?? [];
    if (!supported.length) return;
    selectEnvironment(provider, supported.includes(currentTarget) ? currentTarget : supported[0]!);
  }
  function changeTarget(value: string) {
    const target = value as VMType;
    if (!selectedProvider?.executionTargets.includes(target)) return;
    selectEnvironment(currentProvider, target);
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
      <button ref={scheduleButton} type="button" className="editor-schedule" aria-label="Schedule workflow" title="Schedule workflow" disabled={!save.draft.steps.length || leaving || prewarmDirty} onClick={() => void openSchedule()}><CalendarClock size={19}/></button>
      <div className="editor-controls"><div className="editor-header-actions"><button type="button" className="editor-quiet" disabled={!save.canUndo || leaving || prewarmDirty} onClick={() => { setPanel(undefined); save.undo(); }}>Undo</button><button type="button" className="editor-quiet" disabled={!save.canRedo || leaving || prewarmDirty} onClick={() => { setPanel(undefined); save.redo(); }}>Redo</button><button type="button" className="editor-quiet" onClick={() => { setDetailsName(save.draft.name); setDetailsError(""); setDetails(true); }}>Details</button></div>
      <div className="editor-action-menu"><Dropdown label="Actions" accessibleLabel="Workflow actions" items={[
        { label: "Undo", disabled: !save.canUndo || leaving || prewarmDirty, onSelect: () => { setPanel(undefined); save.undo(); } },
        { label: "Redo", disabled: !save.canRedo || leaving || prewarmDirty, onSelect: () => { setPanel(undefined); save.redo(); } },
        { label: "Details", onSelect: () => { setDetailsName(save.draft.name); setDetailsError(""); setDetails(true); } },
      ]}/></div>
      <button type="button" className="editor-play" aria-label="Run workflow" title="Run workflow" disabled={!save.draft.steps.length || leaving || prewarmDirty} onClick={() => void openRun()}><Play size={17} fill="currentColor" aria-hidden="true" /></button></div>
    </header>
    {scheduleError && <div className="editor-alert" role="alert">{scheduleError}</div>}
    {save.message && <div className="editor-alert" role="alert">{save.message} {!save.conflict && <button type="button" onClick={() => void save.flush()}>Try again</button>}</div>}
    {prewarmDirty && <div className="editor-alert" role="status">Save or discard your prewarming changes before running or scheduling.</div>}
    {!onRunDirect && <nav className="prewarm-tabs" aria-label="Workflow editor sections"><button type="button" aria-current={editorTab === "workflow" ? "page" : undefined} onClick={() => setEditorTab("workflow")}>Workflow</button><button type="button" aria-current={editorTab === "prewarm" ? "page" : undefined} onClick={() => setEditorTab("prewarm")}>Prewarming</button></nav>}
    {!onRunDirect && <div hidden={editorTab !== "prewarm"}>{currentTarget === "browser" && currentProvider === "onkernel" ? <PrewarmEditor initial={save.draft.prewarm} placeholders={prewarmPlaceholders} loading={prewarmLoading} error={prewarmError} onDirtyChange={setPrewarmDirty} onSave={(steps) => save.update(current => { const next = { ...current }; if (steps.length) next.prewarm = steps; else delete next.prewarm; return next; })} /> : <p className="prewarm-unavailable">Prewarming is available for OnKernel browser workflows.</p>}</div>}
    <div hidden={editorTab !== "workflow"} className={`editor-layout${panel ? " editor-layout--panel" : ""}`}>
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
    <Dialog open={details && available} onOpenChange={closeDetails} title="Workflow details" description="Edit the workflow’s name, description, provider, and VM type.">
      <div className="workflow-fields">
        <label>Name<input maxLength={120} value={detailsName} onChange={(event) => { const value = event.target.value; setDetailsName(value); if (value.trim()) { setDetailsError(""); save.update((current) => ({ ...current, name: value.trim() })); } }} /></label>
        <label>Description<textarea maxLength={1000} value={save.draft.description} onChange={(event) => { const value = event.target.value; save.update((current) => ({ ...current, description: value })); }} /></label>
        <label>Provider<Select label="Provider" value={currentProvider} onChange={changeProvider} disabled={!providers.length} options={[...(!selectedProvider ? [{ value: currentProvider, label: `${providerName(currentProvider)} (unavailable)`, disabled: true }] : []), ...providers.map((item) => ({ value: item.id, label: providerName(item.id) }))]} /></label>
        <label>VM type<Select label="VM type" value={currentTarget} onChange={changeTarget} disabled={!selectedProvider} options={[...(!selectedProvider?.executionTargets.includes(currentTarget) ? [{ value: currentTarget, label: `${vmName(currentTarget)} (unavailable)`, disabled: true }] : []), ...(selectedProvider?.executionTargets ?? []).map((item) => ({ value: item, label: vmName(item) }))]} /></label>
        {providerStatus === "error" && <p role="alert" className="step-error">Could not load providers. We’ll retry automatically.</p>}
        {detailsError && <p role="alert" className="step-error">{detailsError}</p>}
      </div>
    </Dialog>
    <Dialog open={confirmDiscard && available} onOpenChange={setConfirmDiscard} title="Discard unsaved changes?" description="Your unsaved changes will be lost."><div className="workflow-actions"><Button variant="quiet" onClick={() => setConfirmDiscard(false)}>Keep editing</Button><Button onClick={onBack}>Discard changes</Button></div></Dialog>
  </div>;
}
