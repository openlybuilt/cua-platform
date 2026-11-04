"use client";

import { useState } from "react";
import type { Workflow } from "@/lib/workflows/contracts";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useExecutionTargets } from "@/components/service/service-gate";
import { WorkflowCreate } from "./workflow-create";
import { WorkflowEditor } from "./workflow-editor";
import { WorkflowHome } from "./workflow-home";
import { TimezoneSettings } from "@/components/scheduling/timezone-settings";

type Screen = { kind: "home" } | { kind: "create" } | { kind: "editor"; workflow: Workflow };
export function WorkflowWorkspace() {
  const [view, setView] = useState<"workflows" | "settings">("workflows");
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const targets = useExecutionTargets();
  if (screen.kind === "create") return <WorkflowCreate targets={targets} onCreated={(workflow) => setScreen({ kind: "editor", workflow })} onBack={() => setScreen({ kind: "home" })} />;
  if (screen.kind === "editor") return <WorkflowEditor key={screen.workflow.id} workflow={screen.workflow} windowsAvailable={targets.includes("windows")} onBack={() => setScreen({ kind: "home" })} />;
  return <WorkspaceShell view={view} onViewChange={setView}>{view === "settings" ? <section className="timezone-settings"><h1>Settings</h1><h2>Time zone</h2><TimezoneSettings /></section> : <WorkflowHome onCreate={() => setScreen({ kind: "create" })} onOpen={(workflow) => setScreen({ kind: "editor", workflow })} />}</WorkspaceShell>;
}
