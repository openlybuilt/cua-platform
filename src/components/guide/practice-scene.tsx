"use client";

import { Plus, Play, ArrowLeft, Check } from "lucide-react";
import { useEffect, type Dispatch, type SetStateAction } from "react";

export type PracticeStep = "create" | "details" | "addWebsite" | "run" | "result" | "back" | "history" | "settings" | "settingsView" | "thanks";

export type PracticeValues = { name: string; target: string; description: string; url: string; click: string };
type Props = { step: PracticeStep; advance: () => void; values: PracticeValues; setValues: Dispatch<SetStateAction<PracticeValues>>; stepEditor: "closed" | "choose" | "website"; setStepEditor: Dispatch<SetStateAction<"closed" | "choose" | "website">> };

export function PracticeScene({ step, advance, values, setValues, stepEditor, setStepEditor }: Props) {
  const { name, target, description, url } = values;
  const setValue = (key: keyof PracticeValues, value: string) => setValues(current => ({ ...current, [key]: value }));
  useEffect(() => {
    let valid = false;
    if (step === "addWebsite" && stepEditor === "website") { try { valid = ["http:", "https:"].includes(new URL(url).protocol); } catch { /* Wait for a valid URL. */ } }
    if (!valid) return;
    const timer = window.setTimeout(() => { setStepEditor("closed"); advance(); }, 500);
    return () => window.clearTimeout(timer);
  }, [step, stepEditor, url, advance, setStepEditor]);
  const editing = ["addWebsite", "run"].includes(step);
  if (editing) {
    const hasWebsite = step === "run";
    return <div className="guide-demo-editor">
      <header className="guide-demo-header"><span><ArrowLeft size={18} aria-hidden="true" /></span><span>{name || "Practice workflow"}</span><button type="button" className="guide-demo-play" data-guide-target={step === "run" ? "current" : undefined} aria-label="Run practice workflow" disabled={step !== "run"} onClick={step === "run" ? advance : undefined}><Play size={16} fill="currentColor" /></button></header>
      <div className="guide-demo-editor-body"><aside className="guide-demo-steps"><h2>Steps</h2><p>Click a step to add it.</p><div>↗　Open a website</div><div>✦　Ask AI to act</div><div>T　 Enter text</div><div>⌖　Click</div></aside>
        <div className="guide-demo-canvas"><span>Start</span><i />{hasWebsite && <><div className="guide-demo-node">↗　Open a website <small>{url || "https://example.com"}</small></div><i /></>}<button type="button" className="guide-demo-plus" aria-label="Add practice step" disabled={step !== "addWebsite"} data-guide-target={step === "addWebsite" && stepEditor === "closed" ? "current" : undefined} onClick={() => setStepEditor("choose")}><Plus size={23} /></button><i /><span>End</span></div>
        {step === "addWebsite" && stepEditor === "choose" && <aside className="guide-demo-panel"><h2>Add a step</h2><p>Choose what this step should do.</p><button type="button" data-guide-target="current" onClick={() => setStepEditor("website")}>↗　Open a website</button><button type="button" disabled>✦　Ask AI to act</button><button type="button" disabled>T　 Enter text</button><button type="button" disabled>⌖　Click</button></aside>}
        {step === "addWebsite" && stepEditor === "website" && <aside className="guide-demo-panel"><h2>Open a website</h2><label>Website URL<input data-guide-target="current" value={url} placeholder="https://example.com" onChange={e => setValue("url", e.target.value)} /></label></aside>}
      </div>
    </div>;
  }
  if (step === "result" || step === "back") return <div className="guide-demo-page"><header className="guide-demo-header"><button type="button" className="guide-demo-back" data-guide-target={step === "back" ? "current" : undefined} disabled={step !== "back"} onClick={advance}>← Back</button><span>{name}</span><span>Completed</span></header><div className="guide-demo-run"><section data-guide-target={step === "result" ? "current" : undefined}><h2>Workflow progress</h2><p><Check size={15} /> Open a website</p></section><section><h2>VM screen</h2><div className="guide-demo-vm">example.com<br /><br />Welcome back<br /><br />Sign in</div><p>Logs · 1 step completed</p></section></div></div>;
  return <div className="guide-demo-shell"><aside className="guide-demo-sidebar"><div className="guide-demo-brand">Openly</div><div>▦　Workflows</div><button type="button" disabled={step !== "history"} data-guide-target={step === "history" ? "current" : undefined} onClick={step === "history" ? advance : undefined}>◷　Run history</button><button type="button" disabled={step !== "settings"} data-guide-target={step === "settings" ? "current" : undefined} onClick={step === "settings" ? advance : undefined}>⚙　Settings</button></aside><main className="guide-demo-home">{step === "settings" ? <><header><h1>Run history</h1></header><h2>All runs</h2><div className="guide-demo-table"><div>Workflow <span>Status</span><span>Result</span><span>When</span></div><div><span>{name}</span><span>Completed</span><span>Workflow completed</span><span>Just now</span></div></div></> : (step === "settingsView" || step === "thanks") ? <><header><h1>Settings</h1></header><div data-guide-target="current"><h2>Guide</h2><p>Open guide</p><h2>Recordings</h2><p>Enable or disable recordings</p><h2>Placeholders</h2><p>Add reusable values</p></div></> : <><header><h1>Workflows</h1><button type="button" disabled={step !== "create"} data-guide-target={step === "create" ? "current" : undefined} onClick={step === "create" ? advance : undefined}>＋　Create workflow</button></header><h2>Recent runs</h2><div className="guide-demo-table"><div>Workflow <span>Status</span><span>Result</span><span>When</span></div><div>Browser workflow demo <span>Completed</span><span>Workflow completed</span><span>Recently</span></div></div><h2>All workflows</h2><div className="guide-demo-table"><div>Workflow <span>Last activity</span></div><div>Browser workflow demo <span>Recently</span></div></div></>}</main>
    {step === "details" && <div className="guide-demo-form-wrap"><form className="guide-demo-form" onSubmit={e => { e.preventDefault(); if (name.trim()) advance(); }}><h2>Create a workflow</h2><p>Start with the basics. You’ll add the steps next.</p><label>Workflow name<input data-guide-target="current" value={name} onChange={e => setValue("name", e.target.value)} required /></label><label>Description<textarea value={description} onChange={e => setValue("description", e.target.value)} placeholder="What will this workflow do?" /></label><label>VM type<select value={target} onChange={e => setValue("target", e.target.value)}><option value="browser">Browser VM</option><option value="windows">Computer VM</option></select></label><button type="submit" disabled={!name.trim()}>Continue →</button></form></div>}
  </div>;
}
