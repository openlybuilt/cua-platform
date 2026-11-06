"use client";

import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useServiceAvailable } from "@/components/service/service-gate";
import { request, type Workflow } from "@/lib/workflows/contracts";

export function WorkflowList({ createButtonRef, onCreate, onOpen }: { createButtonRef?: Ref<HTMLButtonElement>; onCreate: () => void; onOpen: (workflow: Workflow) => void }) {
  const [workflows, setWorkflows] = useState<Workflow[]>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Workflow>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const available = useServiceAvailable();
  const load = useCallback(async () => {
    setError("");
    try { setWorkflows(await request<Workflow[]>("workflows")); }
    catch { setError("Could not load workflows."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function remove() {
    if (!selected || deleting) return;
    setDeleting(true); setDeleteError("");
    try {
      const response = await fetch(`/api/workflows/${selected.id}`, { method: "DELETE" });
      if (response.status >= 500) window.dispatchEvent(new Event("openly:service-unavailable"));
      if (!response.ok) throw new Error(response.status === 404 ? "This workflow is no longer available. Refresh the list and try again." : "Could not delete the workflow. Please try again.");
      setWorkflows(current => current?.filter(workflow => workflow.id !== selected.id));
      setSelected(undefined);
    } catch (problem) { setDeleteError(problem instanceof Error ? problem.message : "Could not delete the workflow. Please try again."); }
    finally { setDeleting(false); }
  }
  return <>
    <header className="home-heading"><h1 ref={heading} tabIndex={-1}>Workflows</h1><button ref={createButtonRef} type="button" className="home-create" onClick={onCreate}><Plus size={17} aria-hidden="true" />Create workflow</button></header>
    {error ? <p className="home-message" role="alert">{error} <button type="button" className="home-link" onClick={() => void load()}>Try again</button></p> : !workflows ? <p className="home-message">Loading workflows…</p> : <section className="home-section"><div className="home-section-heading"><h2>All workflows</h2><span>{workflows.length} {workflows.length === 1 ? "workflow" : "workflows"}</span></div><div className="home-table-wrap"><table className="home-table workflow-manage-table"><thead><tr><th>Workflow</th><th>Actions</th></tr></thead><tbody>
      {workflows.map(workflow => <tr key={workflow.id}><td><button type="button" className="home-workflow" onClick={() => onOpen(workflow)}>{workflow.definition.name}</button>{workflow.definition.description && <span className="home-description">{workflow.definition.description}</span>}</td><td><div className="workflow-list-actions"><Button variant="quiet" aria-label={`Edit ${workflow.definition.name}`} onClick={() => onOpen(workflow)}>Edit</Button><Button variant="quiet" className="workflow-delete-action" aria-label={`Delete ${workflow.definition.name}`} onClick={() => { setDeleteError(""); setSelected(workflow); }}>Delete</Button></div></td></tr>)}
      {!workflows.length && <tr><td colSpan={2}>You haven’t created a workflow yet.</td></tr>}
    </tbody></table></div></section>}
    <Dialog open={Boolean(selected) && available} onOpenChange={open => { if (!open && !deleting) setSelected(undefined); }} returnFocus={() => { heading.current?.focus(); return Boolean(heading.current); }} title="Delete workflow?" description={selected ? `Delete ${selected.definition.name}? Past runs and recordings will remain, and future scheduled runs will stop.` : undefined}><div className="workflow-actions"><Button variant="quiet" disabled={deleting} onClick={() => setSelected(undefined)}>Cancel</Button><Button className="workflow-delete-confirm" disabled={deleting} onClick={() => void remove()}>{deleting ? "Deleting…" : "Delete workflow"}</Button></div>{deleteError && <p className="step-error" role="alert">{deleteError}</p>}</Dialog>
  </>;
}
