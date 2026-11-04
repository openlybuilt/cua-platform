"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useServiceAvailable } from "@/components/service/service-gate";
import { request, RequestError, type Definition, type Workflow } from "@/lib/workflows/contracts";

export function WorkflowCreate({ targets, onCreated, onBack }: { targets: ("browser" | "windows")[]; onCreated: (workflow: Workflow) => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<"browser" | "windows">(targets.includes("browser") ? "browser" : "windows");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const submitting = useRef(false);
  const available = useServiceAvailable();
  useEffect(() => { if (targets.length && !targets.includes(target)) setTarget(targets[0]!); }, [targets, target]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (name || description || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [name, description, busy]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || uncertain || !name.trim() || !targets.includes(target)) return;
    submitting.current = true; setBusy(true); setError("");
    const definition: Definition = { name: name.trim(), description, executionTarget: target, inputs: [], steps: [] };
    try { onCreated(await request<Workflow>("workflows", { body: definition })); }
    catch (problem) {
      const unknown = !(problem instanceof RequestError) || problem.status >= 500;
      setUncertain(unknown);
      setError(unknown ? "The workflow may have been created. Check your workflow list before trying again." : problem.message);
    } finally { submitting.current = false; setBusy(false); }
  }
  function back() {
    if (busy) return;
    if (!uncertain && (name || description)) setConfirm(true); else onBack();
  }
  return <div className="workflow-create-page"><header className="workflow-create-header"><button type="button" onClick={back} disabled={busy}><ArrowLeft size={18} aria-hidden="true" /> Back</button></header>
    <main className="workflow-create"><h1>Create a workflow.</h1><p>Start with the basics. You’ll add the steps on the next screen.</p>
      <form onSubmit={(event) => void create(event)}><label htmlFor="workflow-name">Workflow name<input id="workflow-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Check a website" /></label>
        <label htmlFor="workflow-description">Description<textarea id="workflow-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will this workflow do?" /></label>
        <label htmlFor="workflow-vm">VM type<Select id="workflow-vm" label="VM type" value={target} onChange={(value) => setTarget(value as typeof target)} options={[{ value: "browser", label: "Browser VM", disabled: !targets.includes("browser") }, { value: "windows", label: "Computer VM", disabled: !targets.includes("windows") }]} /></label>
        {error && <p className="step-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy || uncertain || !name.trim() || !targets.includes(target)}>{busy ? "Creating…" : "Continue →"}</Button>
      </form>
    </main>
    <Dialog open={confirm && available} onOpenChange={setConfirm} title="Discard changes?" description="Your workflow has not been created."><div className="workflow-actions"><Button variant="quiet" onClick={() => setConfirm(false)}>Keep editing</Button><Button onClick={onBack}>Discard changes</Button></div></Dialog>
  </div>;
}
