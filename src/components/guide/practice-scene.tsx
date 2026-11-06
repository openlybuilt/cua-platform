"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Definition, Run, Step, Workflow } from "@/lib/workflows/contracts";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkflowHome } from "@/components/workflows/workflow-home";
import { WorkflowCreateFields } from "@/components/workflows/workflow-create";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";
import { RunView } from "@/components/runs/run-view";
import { RunHistory } from "@/components/runs/run-history";
import { Recordings } from "@/components/settings/recordings";
import { Placeholders } from "@/components/settings/placeholders";
import { TimezoneSettings } from "@/components/scheduling/timezone-settings";
import { Button } from "@/components/ui/button";

export type PracticeStep = "welcome" | "create" | "details" | "addWebsite" | "run" | "result" | "back" | "history" | "settings" | "settingsView" | "thanks";
export type PracticeValues = { name: string; target: "browser" | "windows"; description: string; step?: Step };
export type GuideDraft = { url: string; text: string; target: string };
type Props = {
  step: PracticeStep; advance: () => void; values: PracticeValues; setValues: Dispatch<SetStateAction<PracticeValues>>;
  stepEditor: "closed" | "choose" | "configure"; setStepEditor: Dispatch<SetStateAction<"closed" | "choose" | "configure">>;
  setDraft: Dispatch<SetStateAction<GuideDraft>>; resetReady: () => void;
  workflow?: Workflow; run?: Run; onRunUpdate: (run: Run) => void; creating: boolean; createUncertain: boolean; error: string;
  createWorkflow: () => Promise<void>; stepSaved: (definition: Definition) => void; startRun: (workflow: Workflow) => Promise<void>;
};

export function PracticeScene({ step, advance, values, setValues, setStepEditor, setDraft, resetReady, workflow, run, onRunUpdate, creating, createUncertain, error, createWorkflow, stepSaved, startRun }: Props) {
  const setValue = (key: "name" | "target" | "description", value: string) => setValues(current => ({ ...current, [key]: value }));
  if ((step === "addWebsite" || step === "run") && workflow) return <div onClickCapture={event => {
    const button = (event.target as HTMLElement).closest("button");
    if (step !== "addWebsite" || !button) return;
    if (button.classList.contains("editor-plus")) setStepEditor("choose");
    if (button.closest(".step-options") || button.closest(".editor-steps")) { setValues(current => ({ ...current, step: undefined })); setDraft({ url: "", text: "", target: "" }); resetReady(); setStepEditor("configure"); }
    if (button.classList.contains("step-close")) setStepEditor("closed");
  }} onChangeCapture={event => {
    const input = event.target;
    if (step !== "addWebsite" || !(input instanceof HTMLInputElement) || !input.closest(".step-fields")) return;
    const label = input.closest("label")?.textContent ?? "";
    const key = label.includes("Website URL") ? "url" : label.includes("Text to enter") ? "text" : label.includes("Where should the text go?") ? "target" : undefined;
    if (key) { resetReady(); setDraft(current => ({ ...current, [key]: input.value })); }
  }}><WorkflowEditor key={workflow.id} workflow={workflow} windowsAvailable={false} onBack={() => {}} onRunStarted={() => {}} onStepSaved={stepSaved} onStepChange={item => { setValues(current => ({ ...current, step: item })); setStepEditor("configure"); }} onRunDirect={startRun} /></div>;
  if ((step === "result" || step === "back") && run) return <RunView initial={run} onBack={advance} onRunUpdate={onRunUpdate} example={workflow ? { workflow } : undefined} />;
  const view = step === "settings" ? "history" : step === "settingsView" || step === "thanks" ? "settings" : "home";
  return <WorkspaceShell view={view} onViewChange={next => { if ((step === "history" && next === "history") || (step === "settings" && next === "settings")) advance(); }}>
    {view === "home" && <WorkflowHome active onCreate={() => { if (step === "create") advance(); }} onOpen={() => {}} onOpenRun={() => {}} />}
    {view === "history" && <RunHistory active onOpen={() => {}} />}
    {view === "settings" && <section className="timezone-settings page-enter"><h1>Settings</h1><section className="guide-settings"><h2>Guide</h2><Button>Open guide</Button></section><h2>Time zone</h2><TimezoneSettings /><Recordings /><Placeholders /></section>}
    {step === "details" && <div className="guide-create-overlay"><div className="guide-create-dialog dialog-content"><div className="dialog-heading"><div><h2 className="dialog-title">Create a workflow</h2><p className="dialog-description">Start with the basics. You’ll add the steps next.</p></div></div><WorkflowCreateFields name={values.name} description={values.description} target="browser" targets={["browser"]} setName={value => setValue("name", value)} setDescription={value => setValue("description", value)} setTarget={() => {}} disabled={creating || createUncertain} busy={creating} error={error} onSubmit={event => { event.preventDefault(); void createWorkflow(); }} /></div></div>}
  </WorkspaceShell>;
}
