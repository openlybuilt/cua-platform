"use client";

import { Clock3, House, LayoutGrid, Menu, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function WorkspaceShell({ children, view, onViewChange }: { children: ReactNode; view: "home" | "workflows" | "history" | "settings"; onViewChange: (view: "home" | "workflows" | "history" | "settings") => void }) {
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
      <a className="workspace-brand" href="https://openlybuilt.com" aria-label="Openly website">Openly</a>
      <button type="button" className="workspace-sidebar-toggle" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="workspace-navigation" onClick={toggleSidebar}><Menu size={18} aria-hidden="true" /></button>
      <nav id="workspace-navigation" aria-label="Workspace">
        <button type="button" className={`workspace-nav-item${view === "home" ? " workspace-nav-item--current" : ""}`} aria-label="Home" title={collapsed ? "Home" : undefined} aria-current={view === "home" ? "page" : undefined} onClick={() => onViewChange("home")}><House size={17} aria-hidden="true" /><span className="workspace-nav-label">Home</span></button>
        <button type="button" className={`workspace-nav-item${view === "workflows" ? " workspace-nav-item--current" : ""}`} aria-label="Workflows" title={collapsed ? "Workflows" : undefined} aria-current={view === "workflows" ? "page" : undefined} onClick={() => onViewChange("workflows")}><LayoutGrid size={17} aria-hidden="true" /><span className="workspace-nav-label">Workflows</span></button>
        <button type="button" className={`workspace-nav-item${view === "history" ? " workspace-nav-item--current" : ""}`} aria-label="Run history" title={collapsed ? "Run history" : undefined} aria-current={view === "history" ? "page" : undefined} onClick={() => onViewChange("history")}><Clock3 size={17} aria-hidden="true" /><span className="workspace-nav-label">Run history</span></button>
        <button type="button" className={`workspace-nav-item${view === "settings" ? " workspace-nav-item--current" : ""}`} aria-label="Settings" title={collapsed ? "Settings" : undefined} aria-current={view === "settings" ? "page" : undefined} onClick={() => onViewChange("settings")}><Settings size={17} aria-hidden="true" /><span className="workspace-nav-label">Settings</span></button>
      </nav>
    </aside>
    <main className="workspace-content">{children}</main>
  </div>;
}
