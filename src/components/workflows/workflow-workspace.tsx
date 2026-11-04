"use client";

import { useState } from "react";
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

type Screen = { kind: "home" } | { kind: "create" } | { kind: "editor"; workflow: Workflow } | { kind: "run"; run: Run };
export function WorkflowWorkspace() {
  const [view, setView] = useState<"workflows" | "history" | "settings">("workflows");
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const targets = useExecutionTargets();
  if (screen.kind === "create") return <WorkflowCreate targets={targets} onCreated={(workflow) => setScreen({ kind: "editor", workflow })} onBack={() => setScreen({ kind: "home" })} />;
  if (screen.kind === "run") return <RunView initial={screen.run} onBack={() => setScreen({ kind: "home" })} />;
  if (screen.kind === "editor") return <WorkflowEditor key={screen.workflow.id} workflow={screen.workflow} onRunStarted={(run) => setScreen({ kind: "run", run })} windowsAvailable={targets.includes("windows")} onBack={() => setScreen({ kind: "home" })} />;
  if (view === "history") return <RunHistory onOpen={(run) => setScreen({ kind: "run", run })} onBack={() => setView("workflows")} />;
  return <WorkspaceShell view={view} onViewChange={setView}>{view === "settings" ? <section className="timezone-settings"><h1>Settings</h1><h2>Time zone</h2><TimezoneSettings /><Recordings /><Placeholders /></section> : <WorkflowHome onOpenRun={(run) => setScreen({ kind: "run", run })} onCreate={() => setScreen({ kind: "create" })} onOpen={(workflow) => setScreen({ kind: "editor", workflow })} />}</WorkspaceShell>;
}
