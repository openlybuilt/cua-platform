"use client";

import { useState } from "react";
import type { Workflow } from "@/lib/workflows/contracts";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useExecutionTargets } from "@/components/service/service-gate";
import { WorkflowCreate } from "./workflow-create";
import { WorkflowEditor } from "./workflow-editor";
import { WorkflowHome } from "./workflow-home";

type Screen = { kind: "home" } | { kind: "create" } | { kind: "editor"; workflow: Workflow };
export function WorkflowWorkspace() {
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const targets = useExecutionTargets();
  if (screen.kind === "create") return <WorkflowCreate targets={targets} onCreated={(workflow) => setScreen({ kind: "editor", workflow })} onBack={() => setScreen({ kind: "home" })} />;
  if (screen.kind === "editor") return <WorkflowEditor key={screen.workflow.id} workflow={screen.workflow} windowsAvailable={targets.includes("windows")} onBack={() => setScreen({ kind: "home" })} />;
  return <WorkspaceShell><WorkflowHome onCreate={() => setScreen({ kind: "create" })} onOpen={(workflow) => setScreen({ kind: "editor", workflow })} /></WorkspaceShell>;
}
