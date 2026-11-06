"use client";

import { useEffect, useRef, useState } from "react";
import type { Run, Workflow } from "@/lib/workflows/contracts";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useExecutionTargets, useServiceAvailable } from "@/components/service/service-gate";
import { WorkflowCreate } from "./workflow-create";
import { WorkflowEditor } from "./workflow-editor";
import { WorkflowHome } from "./workflow-home";
import { WorkflowList } from "./workflow-list";
import { RunView } from "@/components/runs/run-view";
import { RunHistory } from "@/components/runs/run-history";
import { Recordings } from "@/components/settings/recordings";
import { Placeholders } from "@/components/settings/placeholders";
import { TimezoneSettings } from "@/components/scheduling/timezone-settings";
import { PracticeGuide } from "@/components/guide/practice-guide";
import { Button } from "@/components/ui/button";

type Screen = { kind: "home" } | { kind: "editor"; workflow: Workflow } | { kind: "run"; run: Run };
export function WorkflowWorkspace() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideGeneration, setGuideGeneration] = useState(0);
  useEffect(() => { try { setGuideOpen(localStorage.getItem("openly:guide-seen") !== "true"); } catch { setGuideOpen(true); } }, []);
  function closeGuide() { try { localStorage.setItem("openly:guide-seen", "true"); } catch { /* Storage is optional. */ } setGuideOpen(false); setGuideGeneration(value => value + 1); }
  const [view, setView] = useState<"home" | "workflows" | "history" | "settings">("home");
  const [createOpen, setCreateOpen] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const listCreateButtonRef = useRef<HTMLButtonElement>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const targets = useExecutionTargets();
  const available = useServiceAvailable();
  if (screen.kind === "run") return <div className="page-enter"><RunView initial={screen.run} example={screen.run.example && screen.run.exampleWorkflow ? { workflow: screen.run.exampleWorkflow } : undefined} onBack={() => setScreen({ kind: "home" })} /></div>;
  if (screen.kind === "editor") return <div className="page-enter"><WorkflowEditor key={screen.workflow.id} workflow={screen.workflow} onRunStarted={(run) => setScreen({ kind: "run", run })} windowsAvailable={targets.includes("windows")} onBack={() => setScreen({ kind: "home" })} /></div>;
  return <WorkspaceShell view={view} onViewChange={setView}>
    <div className="workspace-view" hidden={view !== "home"}><WorkflowHome key={guideGeneration} createButtonRef={createButtonRef} active={view === "home"} onOpenRun={(run) => setScreen({ kind: "run", run })} onCreate={() => setCreateOpen(true)} onOpen={(workflow) => setScreen({ kind: "editor", workflow })} onViewHistory={() => setView("history")} onViewWorkflows={() => setView("workflows")} /></div>
    {view === "workflows" && <WorkflowList createButtonRef={listCreateButtonRef} onCreate={() => setCreateOpen(true)} onOpen={(workflow) => setScreen({ kind: "editor", workflow })} />}
    <div className="workspace-view" hidden={view !== "history"}><RunHistory active={view === "history"} onOpen={(run) => setScreen({ kind: "run", run })} /></div>
    {createOpen && <WorkflowCreate targets={targets} returnFocus={() => { const button = view === "workflows" ? listCreateButtonRef.current : createButtonRef.current; if (!button?.isConnected || button.closest("[hidden]")) return false; button.focus(); return true; }} onCreated={(workflow) => { setCreateOpen(false); setScreen({ kind: "editor", workflow }); }} onBack={() => setCreateOpen(false)} />}
    {view === "settings" && <section className="timezone-settings page-enter"><h1>Settings</h1><section className="guide-settings"><h2>Guide</h2><Button onClick={() => setGuideOpen(true)}>Open guide</Button></section><h2>Time zone</h2><TimezoneSettings /><Recordings /><Placeholders /></section>}
    {guideOpen && <PracticeGuide open={available} onClose={closeGuide} />}
  </WorkspaceShell>;
}
