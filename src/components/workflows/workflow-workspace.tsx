"use client";

import { useRef, useState } from "react";
import type { Run, Workflow } from "@/lib/workflows/contracts";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useExecutionTargets } from "@/components/service/service-gate";
import { WorkflowCreate } from "./workflow-create";
import { WorkflowEditor } from "./workflow-editor";
import { WorkflowHome } from "./workflow-home";
import { RunView } from "@/components/runs/run-view";
import { RunHistory } from "@/components/runs/run-history";
import { Recordings } from "@/components/settings/recordings";
import { Placeholders } from "@/components/settings/placeholders";
import { TimezoneSettings } from "@/components/scheduling/timezone-settings";

type Screen = { kind: "home" } | { kind: "editor"; workflow: Workflow } | { kind: "run"; run: Run };
export function WorkflowWorkspace() {
  const [view, setView] = useState<"workflows" | "history" | "settings">("workflows");
  const [createOpen, setCreateOpen] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const targets = useExecutionTargets();
  if (screen.kind === "run") return <div className="page-enter"><RunView initial={screen.run} onBack={() => setScreen({ kind: "home" })} /></div>;
  if (screen.kind === "editor") return <div className="page-enter"><WorkflowEditor key={screen.workflow.id} workflow={screen.workflow} onRunStarted={(run) => setScreen({ kind: "run", run })} windowsAvailable={targets.includes("windows")} onBack={() => setScreen({ kind: "home" })} /></div>;
  return <WorkspaceShell view={view} onViewChange={setView}>
    <div className="workspace-view" hidden={view !== "workflows"}><WorkflowHome createButtonRef={createButtonRef} active={view === "workflows"} onOpenRun={(run) => setScreen({ kind: "run", run })} onCreate={() => setCreateOpen(true)} onOpen={(workflow) => setScreen({ kind: "editor", workflow })} /></div>
    <div className="workspace-view" hidden={view !== "history"}><RunHistory active={view === "history"} onOpen={(run) => setScreen({ kind: "run", run })} /></div>
    {createOpen && <WorkflowCreate targets={targets} returnFocus={() => { const button = createButtonRef.current; if (!button?.isConnected || button.closest("[hidden]")) return false; button.focus(); return true; }} onCreated={(workflow) => { setCreateOpen(false); setScreen({ kind: "editor", workflow }); }} onBack={() => setCreateOpen(false)} />}
    {view === "settings" && <section className="timezone-settings page-enter"><h1>Settings</h1><h2>Time zone</h2><TimezoneSettings /><Recordings /><Placeholders /></section>}
  </WorkspaceShell>;
}
