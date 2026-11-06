"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Definition, Run, Workflow } from "@/lib/workflows/contracts";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkflowHome } from "@/components/workflows/workflow-home";
import { WorkflowCreateFields } from "@/components/workflows/workflow-create";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";
import { RunView } from "@/components/runs/run-view";
import { RunHistory } from "@/components/runs/run-history";
import { Recordings } from "@/components/settings/recordings";
import { Placeholders } from "@/components/settings/placeholders";
import { TimezoneSettings } from "@/components/scheduling/timezone-settings";

export type PracticeStep = "welcome" | "create" | "details" | "addWebsite" | "run" | "result" | "back" | "history" | "settings" | "settingsView" | "thanks";
export type PracticeValues = { name: string; target: "browser" | "windows"; description: string; url: string; click: string };
type Props = { step: PracticeStep; advance: () => void; values: PracticeValues; setValues: Dispatch<SetStateAction<PracticeValues>>; stepEditor: "closed" | "choose" | "website"; setStepEditor: Dispatch<SetStateAction<"closed" | "choose" | "website">> };

export function PracticeScene({ step, advance, values, setValues, stepEditor, setStepEditor }: Props) {
  const [runDefinition, setRunDefinition] = useState<Definition>();
  const setValue = (key: keyof PracticeValues, value: string) => setValues(current => ({ ...current, [key]: value }));
  useEffect(() => {
    if (step !== "addWebsite" || stepEditor !== "website" || !values.url) return;
    const timer = window.setTimeout(() => { setStepEditor("closed"); advance(); }, 500);
    return () => window.clearTimeout(timer);
  }, [step, stepEditor, values.url, advance, setStepEditor]);
  const definition: Definition = runDefinition ?? { name: values.name || "Practice workflow", description: values.description, executionTarget: values.target, inputs: [], steps: values.url ? [{ type: "navigate", url: values.url }] : [] };
  const workflow: Workflow = { id: "practice", version: 1, definition, createdAt: new Date().toISOString() };
  const run: Run = { id: "practice", workflowName: definition.name, status: "completed", recordingStatus: "unavailable", result: { message: "Workflow completed" }, createdAt: new Date().toISOString(), steps: definition.steps.map(() => ({ status: "completed" })) };
  if (step === "addWebsite" || step === "run") return <div onClickCapture={event => {
    const button = (event.target as HTMLElement).closest("button");
    if (step !== "addWebsite" || !button) return;
    if (button.classList.contains("editor-plus")) setStepEditor("choose");
    if (button.closest(".step-options") && button.textContent?.includes("Open a website")) setStepEditor("website");
  }}><WorkflowEditor workflow={{ ...workflow, definition: { ...definition, steps: step === "run" && values.url ? [{ type: "navigate", url: values.url }] : [] } }} windowsAvailable onBack={() => {}} onRunStarted={() => {}} practice={{ onStep: item => { if (item.type === "navigate") setValue("url", item.url); }, onRun: draft => { setRunDefinition(draft); advance(); } }} /></div>;
  if (step === "result" || step === "back") return <RunView initial={run} onBack={advance} practice={{ workflow }} />;
  const view = step === "settings" ? "history" : step === "settingsView" || step === "thanks" ? "settings" : "workflows";
  return <WorkspaceShell view={view} practice onViewChange={next => { if ((step === "history" && next === "history") || (step === "settings" && next === "settings")) advance(); }}>
    {view === "workflows" && <WorkflowHome active practice={{ workflows: [], runs: [] }} onCreate={() => { if (step === "create") advance(); }} onOpen={() => {}} onOpenRun={() => {}} />}
    {view === "history" && <RunHistory active practiceRuns={[run]} onOpen={() => {}} />}
    {view === "settings" && <section className="timezone-settings page-enter"><h1>Settings</h1><section className="guide-settings"><h2>Guide</h2><button type="button">Open guide</button></section><h2>Time zone</h2><TimezoneSettings practice /><Recordings practice /><Placeholders practice /></section>}
    {step === "details" && <div className="guide-create-overlay"><div className="guide-create-dialog dialog-content"><div className="dialog-heading"><div><h2 className="dialog-title">Create a workflow</h2><p className="dialog-description">Start with the basics. You’ll add the steps next.</p></div></div><WorkflowCreateFields name={values.name} description={values.description} target={values.target} targets={["browser", "windows"]} setName={value => setValue("name", value)} setDescription={value => setValue("description", value)} setTarget={value => setValue("target", value)} onSubmit={event => { event.preventDefault(); if (values.name.trim()) advance(); }} /></div></div>}
  </WorkspaceShell>;
}
