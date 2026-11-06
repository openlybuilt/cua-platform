"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useServiceAvailable } from "@/components/service/service-gate";
import { request, RequestError, type Definition, type Workflow } from "@/lib/workflows/contracts";
import { useProviderCapabilities, providerName, vmName, type ProviderCapability, type VMType } from "./use-provider-capabilities";

export function WorkflowCreate({ targets, onCreated, onBack, returnFocus }: { targets: ("browser" | "windows")[]; onCreated: (workflow: Workflow) => void; onBack: () => void; returnFocus: () => boolean }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<"browser" | "windows">(targets.includes("browser") ? "browser" : "windows");
  const { providers, status } = useProviderCapabilities();
  const [provider, setProvider] = useState("");
  const selected = providers.find((item) => item.id === provider);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const submitting = useRef(false);
  const available = useServiceAvailable();
  useEffect(() => { if (!provider && providers.length) { const first = providers.find((item) => item.id === "onkernel") ?? providers[0]!; setProvider(first.id); setTarget(first.executionTargets.includes("browser") ? "browser" : first.executionTargets[0]!); } }, [providers, provider]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (name || description || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [name, description, busy]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || uncertain || !name.trim() || !selected?.executionTargets.includes(target)) return;
    submitting.current = true; setBusy(true); setError("");
    const definition: Definition = { name: name.trim(), description, executionTarget: target, provider, inputs: [], steps: [] };
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
  return <>
    <Dialog open={available} onOpenChange={(next) => { if (!next) back(); }} returnFocus={returnFocus} title="Create a workflow" description="Start with the basics. You’ll add the steps next.">
      <WorkflowCreateFields name={name} description={description} target={target} targets={selected?.executionTargets ?? []} provider={provider} providers={providers} providerStatus={status} setProvider={(id) => { setProvider(id); const choices = providers.find((item) => item.id === id)?.executionTargets ?? []; if (!choices.includes(target) && choices.length) setTarget(choices[0]!); }} setName={setName} setDescription={setDescription} setTarget={setTarget} onSubmit={(event) => void create(event)} disabled={busy || uncertain} busy={busy} error={error} />
    </Dialog>
    <Dialog open={confirm && available} onOpenChange={setConfirm} title="Discard changes?" description="Your workflow has not been created."><div className="workflow-actions"><Button variant="quiet" onClick={() => setConfirm(false)}>Keep editing</Button><Button onClick={onBack}>Discard changes</Button></div></Dialog>
  </>;
}

export function WorkflowCreateFields({ name, description, target, targets, provider, providers, providerStatus, setProvider, setName, setDescription, setTarget, onSubmit, disabled = false, busy = false, error = "" }: {
  name: string; description: string; target: VMType; targets: VMType[]; provider: string; providers: ProviderCapability[]; providerStatus: "loading" | "ready" | "error"; setProvider: (value: string) => void;
  setName: (value: string) => void; setDescription: (value: string) => void; setTarget: (value: "browser" | "windows") => void;
  onSubmit: (event: React.FormEvent) => void; disabled?: boolean; busy?: boolean; error?: string;
}) {
  return <form className="workflow-create-form" onSubmit={onSubmit}>
    <label>Workflow name<input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Check a website" /></label>
    <label>Description<textarea maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will this workflow do?" /></label>
    <label>Provider<Select label="Provider" value={provider} disabled={disabled || !providers.length} onChange={setProvider} options={providers.length ? [...(provider && !providers.some((item) => item.id === provider) ? [{ value: provider, label: `${providerName(provider)} (unavailable)`, disabled: true }] : []), ...providers.map((item) => ({ value: item.id, label: providerName(item.id) }))] : [{ value: provider, label: providerStatus === "loading" ? "Loading providers…" : "No providers available", disabled: true }]} /></label>
    <label>VM type<Select label="VM type" value={target} disabled={disabled || !targets.length} onChange={(value) => setTarget(value as VMType)} options={targets.length ? targets.map((item) => ({ value: item, label: vmName(item) })) : [{ value: target, label: "No VM types available", disabled: true }]} /></label>
    {providerStatus === "error" && <p className="step-error" role="alert">Could not load providers. We’ll retry automatically.</p>}
    {providerStatus === "ready" && !providers.length && <p className="step-error" role="alert">No providers are currently available.</p>}
    {error && <p className="step-error" role="alert">{error}</p>}
    <Button type="submit" disabled={disabled || !name.trim() || !targets.includes(target)}>{busy ? "Creating…" : "Continue →"}</Button>
  </form>;
}
