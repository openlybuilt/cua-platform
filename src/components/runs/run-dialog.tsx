"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { request, type Run, type Workflow } from "@/lib/workflows/contracts";

type Placeholder = { name: string; secret: boolean };
export function RunDialog({ workflow, onClose, onStarted }: { workflow: Workflow; onClose: () => void; onStarted: (run: Run) => void }) {
  const [placeholders, setPlaceholders] = useState<Placeholder[]>();
  const [values, setValues] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, boolean>>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const runId = useRef<string>("");
  const [error, setError] = useState("");
  useEffect(() => { let active = true; request<Placeholder[]>("placeholders").then((value) => { if (active) setPlaceholders(value); }).catch(() => { if (active) setError("Could not load saved values."); }); return () => { active = false; }; }, []);
  const missing = workflow.definition.inputs.filter((name) => !placeholders?.some((item) => item.name === name));
  const hasSecrets = workflow.definition.inputs.some((name) => placeholders?.find((item) => item.name === name)?.secret ?? (secrets[name] !== false));
  async function start() {
    setBusy(true); setError("");
    try {
      for (const name of missing) { const saved = await request<Placeholder>("placeholders", { body: { name, value: values[name], secret: secrets[name] !== false, createOnly: true } }); setPlaceholders((current) => [...(current ?? []), saved]); }
      const timeoutMs = Math.min(3600000, 120000 + Math.ceil(workflow.definition.steps.reduce((total, step) => total + (step.type === "wait" ? step.seconds * 1000 : 0), 0)));
      runId.current ||= crypto.randomUUID();
      const run = await request<Run>(`workflows/${workflow.id}/runs`, { body: { id: runId.current, version: workflow.version, inputs: {}, acknowledgeSecretExposure: acknowledged, timeoutMs } });
      onStarted(run);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not start the run."); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }} title="Run workflow" description="Ready to start this workflow?">
    {missing.map((name) => <label className="run-input" key={name}>{name}<input type={secrets[name] === false ? "text" : "password"} autoComplete="off" value={values[name] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} /><span><input type="checkbox" checked={secrets[name] !== false} onChange={(event) => setSecrets((current) => ({ ...current, [name]: event.target.checked }))} /> Treat this value as a secret</span></label>)}
    {hasSecrets && <label className="run-secret"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> I understand secrets may appear on the website, live VM, screenshots, recordings, or in AI requests.</label>}
    {error && <p className="step-error" role="alert">{error}</p>}<Button disabled={busy || !placeholders || missing.some((name) => !values[name]) || (hasSecrets && !acknowledged)} onClick={() => void start()}>{busy ? "Starting…" : "Start run"}</Button>
  </Dialog>;
}
