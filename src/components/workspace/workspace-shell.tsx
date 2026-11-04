"use client";

import { AccountMenu } from "./account-menu";
import { Clock3, LayoutGrid, Menu, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("openly:sidebar-collapsed") === "true"); } catch { /* Storage is optional. */ }
  }, []);
  function toggleSidebar() {
    setCollapsed((previous) => {
      const next = !previous;
      try { localStorage.setItem("openly:sidebar-collapsed", String(next)); } catch { /* Storage is optional. */ }
      return next;
    });
  }
  return <div className={`workspace-shell${collapsed ? " workspace-shell--collapsed" : ""}`}>
    <aside className="workspace-sidebar">
      <div className="workspace-brand">Openly</div>
      <button type="button" className="workspace-sidebar-toggle" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="workspace-navigation" onClick={toggleSidebar}><Menu size={18} aria-hidden="true" /></button>
      <nav id="workspace-navigation" aria-label="Workspace">
        <button type="button" className="workspace-nav-item workspace-nav-item--current" aria-label="Workflows" title={collapsed ? "Workflows" : undefined} aria-current="page"><LayoutGrid size={17} aria-hidden="true" /><span className="workspace-nav-label">Workflows</span></button>
        <button type="button" className="workspace-nav-item" aria-label="Run history" title={collapsed ? "Run history" : undefined} disabled><Clock3 size={17} aria-hidden="true" /><span className="workspace-nav-label">Run history</span></button>
        <button type="button" className="workspace-nav-item" aria-label="Settings" title={collapsed ? "Settings" : undefined} disabled><Settings size={17} aria-hidden="true" /><span className="workspace-nav-label">Settings</span></button>
      </nav>
      <div className="workspace-account"><AccountMenu compact={collapsed} /></div>
    </aside>
    <main className="workspace-content">{children}</main>
  </div>;
}
