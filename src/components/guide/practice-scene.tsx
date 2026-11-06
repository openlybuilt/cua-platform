"use client";

import { Plus, Play, ArrowLeft, Check } from "lucide-react";
import { useEffect, type Dispatch, type SetStateAction } from "react";

export type PracticeStep = "create" | "details" | "addWebsite" | "chooseWebsite" | "website" | "addClick" | "chooseClick" | "click" | "run" | "result" | "history" | "historyRun" | "inspectRun" | "settings" | "settingsView";

export type PracticeValues = { name: string; target: string; description: string; url: string; click: string };
type Props = { step: PracticeStep; advance: () => void; values: PracticeValues; setValues: Dispatch<SetStateAction<PracticeValues>> };

export function PracticeScene({ step, advance, values, setValues }: Props) {
  const { name, target, description, url, click } = values;
  const setValue = (key: keyof PracticeValues, value: string) => setValues(current => ({ ...current, [key]: value }));
  useEffect(() => {
    let valid = false;
    if (step === "website") { try { valid = ["http:", "https:"].includes(new URL(url).protocol); } catch { /* Wait for a valid URL. */ } }
    if (step === "click") valid = Boolean(click.trim());
    if (!valid) return;
    const timer = window.setTimeout(advance, 500);
    return () => window.clearTimeout(timer);
  }, [step, url, click, advance]);
  const editing = ["addWebsite", "chooseWebsite", "website", "addClick", "chooseClick", "click", "run"].includes(step);
  if (editing) {
    const hasWebsite = ["addClick", "chooseClick", "click", "run"].includes(step);
    const hasClick = step === "run";
    return <div className="guide-demo-editor">
      <header className="guide-demo-header"><span><ArrowLeft size={18} aria-hidden="true" /></span><span>{name || "Practice workflow"}</span><button type="button" className="guide-demo-play" data-guide-target={step === "run" ? "current" : undefined} aria-label="Run practice workflow" disabled={step !== "run"} onClick={step === "run" ? advance : undefined}><Play size={16} fill="currentColor" /></button></header>
      <div className="guide-demo-editor-body"><aside className="guide-demo-steps"><h2>Steps</h2><p>Click a step to add it.</p><div>↗　Open a website</div><div>✦　Ask AI to act</div><div>T　 Enter text</div><div>⌖　Click</div></aside>
        <div className="guide-demo-canvas"><span>Start</span><i />{hasWebsite && <><div className="guide-demo-node">↗　Open a website <small>{url || "https://example.com"}</small></div><i /></>}{hasClick && <><div className="guide-demo-node">⌖　Click <small>{click || "The Sign in button"}</small></div><i /></>}<button type="button" className="guide-demo-plus" aria-label="Add practice step" disabled={step !== "addWebsite" && step !== "addClick"} data-guide-target={step === "addWebsite" || step === "addClick" ? "current" : undefined} onClick={step === "addWebsite" || step === "addClick" ? advance : undefined}><Plus size={23} /></button><i /><span>End</span></div>
        {(step === "chooseWebsite" || step === "chooseClick") && <aside className="guide-demo-panel"><h2>Add a step</h2><p>Choose what this step should do.</p><button type="button" disabled={step !== "chooseWebsite"} data-guide-target={step === "chooseWebsite" ? "current" : undefined} onClick={step === "chooseWebsite" ? advance : undefined}>↗　Open a website</button><button type="button" disabled>✦　Ask AI to act</button><button type="button" disabled>T　 Enter text</button><button type="button" disabled={step !== "chooseClick"} data-guide-target={step === "chooseClick" ? "current" : undefined} onClick={step === "chooseClick" ? advance : undefined}>⌖　Click</button></aside>}
        {step === "website" && <aside className="guide-demo-panel"><h2>Open a website</h2><label>Website URL<input data-guide-target="current" value={url} placeholder="https://example.com" onChange={e => setValue("url", e.target.value)} /></label></aside>}
        {step === "click" && <aside className="guide-demo-panel"><h2>Click</h2><label>What should the AI click?<textarea data-guide-target="current" value={click} placeholder="e.g. The Sign in button" onChange={e => setValue("click", e.target.value)} /></label></aside>}
      </div>
    </div>;
  }
  if (step === "result" || step === "inspectRun") return <div className="guide-demo-page"><header className="guide-demo-header"><span>← Back</span><span>{name}</span><span>Completed</span></header><div className="guide-demo-run"><section data-guide-target={step === "result" ? "current" : undefined}><h2>Workflow progress</h2><p><Check size={15} /> Open a website</p><p><Check size={15} /> Click</p></section><section><h2>VM screen</h2><div className="guide-demo-vm">example.com<br /><br />Welcome back<br /><br />Sign in</div><p data-guide-target={step === "inspectRun" ? "current" : undefined}>Logs · 2 steps completed</p></section></div></div>;
  return <div className="guide-demo-shell"><aside className="guide-demo-sidebar"><div className="guide-demo-brand">Openly</div><div>▦　Workflows</div><button type="button" disabled={step !== "history"} data-guide-target={step === "history" ? "current" : undefined} onClick={step === "history" ? advance : undefined}>◷　Run history</button><button type="button" disabled={step !== "settings"} data-guide-target={step === "settings" ? "current" : undefined} onClick={step === "settings" ? advance : undefined}>⚙　Settings</button></aside><main className="guide-demo-home">{step === "historyRun" ? <><header><h1>Run history</h1></header><h2>All runs</h2><div className="guide-demo-table"><div>Workflow <span>Status</span><span>Result</span><span>When</span></div><div><button type="button" data-guide-target="current" onClick={advance}>{name}</button><span>Completed</span><span>Workflow completed</span><span>Just now</span></div></div></> : step === "settingsView" ? <><header><h1>Settings</h1></header><h2 data-guide-target="current">Guide</h2><p>Open guide</p><h2>Time zone</h2><p>Recording preferences and placeholders</p></> : <><header><h1>Workflows</h1><button type="button" disabled={step !== "create"} data-guide-target={step === "create" ? "current" : undefined} onClick={step === "create" ? advance : undefined}>＋　Create workflow</button></header><h2>Recent runs</h2><div className="guide-demo-table"><div>Workflow <span>Status</span><span>Result</span><span>When</span></div><div>Browser workflow demo <span>Completed</span><span>Workflow completed</span><span>Recently</span></div></div><h2>All workflows</h2><div className="guide-demo-table"><div>Workflow <span>Last activity</span></div><div>Browser workflow demo <span>Recently</span></div></div></>}</main>
    {step === "details" && <div className="guide-demo-form-wrap"><form className="guide-demo-form" onSubmit={e => { e.preventDefault(); if (name.trim()) advance(); }}><h2>Create a workflow</h2><p>Start with the basics. You’ll add the steps next.</p><label>Workflow name<input data-guide-target="current" value={name} onChange={e => setValue("name", e.target.value)} required /></label><label>Description<textarea value={description} onChange={e => setValue("description", e.target.value)} placeholder="What will this workflow do?" /></label><label>VM type<select value={target} onChange={e => setValue("target", e.target.value)}><option value="browser">Browser VM</option><option value="windows">Computer VM</option></select></label><button type="submit" disabled={!name.trim()}>Continue →</button></form></div>}
  </div>;
}
