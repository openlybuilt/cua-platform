"use client";

import { UserButton } from "@clerk/nextjs";
import { Clock3, LayoutGrid, Settings } from "lucide-react";

export function WorkspaceShell() {
  return <div className="workspace-shell">
    <aside className="workspace-sidebar">
      <div className="workspace-brand">Openly</div>
      <nav aria-label="Workspace">
        <button type="button" className="workspace-nav-item workspace-nav-item--current" aria-current="page"><LayoutGrid size={17} aria-hidden="true" />Workflows</button>
        <button type="button" className="workspace-nav-item" disabled><Clock3 size={17} aria-hidden="true" />Run history</button>
        <button type="button" className="workspace-nav-item" disabled><Settings size={17} aria-hidden="true" />Settings</button>
      </nav>
      <div className="workspace-account"><UserButton /></div>
    </aside>
    <main className="workspace-content"><h1>Workflows</h1></main>
  </div>;
}
