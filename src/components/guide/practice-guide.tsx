"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { request, RequestError, type Definition, type Run, type Workflow } from "@/lib/workflows/contracts";
import { PracticeScene, type PracticeStep, type PracticeValues } from "./practice-scene";

type Lesson = { step: PracticeStep; title: string; caption: string; audio?: string };
const lessons: Lesson[] = [
  { step: "welcome", title: "Welcome to Openly", caption: "Let’s build and run a real Browser workflow together. This will create a workflow and use your configured providers." },
  { step: "create", title: "Let’s build a workflow", caption: "Start by clicking Create workflow." },
  { step: "details", title: "Give it a name", caption: "Give your workflow a name. We’ll use a Browser VM for this example." },
  { step: "addWebsite", title: "Add your steps", caption: "Add Open a website with https://www.google.com, then click Save step." },
  { step: "run", title: "Run the workflow", caption: "Once you’ve added your steps, click play to run your workflow." },
  { step: "result", title: "Watch what happens", caption: "Here you can watch the live VM, follow each step, and see the logs as your workflow runs." },
  { step: "back", title: "Head back", caption: "Let’s head back so I can show you where to find your runs." },
  { step: "history", title: "Run history", caption: "Click Run history to see all of your current and previous runs." },
  { step: "settings", title: "Visit Settings", caption: "Next, click Settings. There are a few useful options I want to show you." },
  { step: "settingsView", title: "Make it yours", caption: "In Settings, you can disable recordings, add placeholders, or watch this guide again whenever you like." },
  { step: "thanks", title: "Thank you!", caption: "Thanks for taking the tour. We hope you enjoy building with Openly!" },
];

type Rect = { x: number; y: number; width: number; height: number };
export function PracticeGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<PracticeValues>({ name: "Check a website", target: "browser", description: "" });
  const [stepEditor, setStepEditor] = useState<"closed" | "choose" | "configure">("closed");
  const [workflow, setWorkflow] = useState<Workflow>();
  const [run, setRun] = useState<Run>();
  const [stage, setStage] = useState<0 | 1>(0);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createUncertain, setCreateUncertain] = useState(false);
  const creatingRef = useRef(false);
  const startingRef = useRef(false);
  const runId = useRef("");
  const [rect, setRect] = useState<Rect>();
  const [muted, setMuted] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const lesson = lessons[index]!;
  const wholePage = lesson.step === "result" || lesson.step === "settingsView";
  const centered = lesson.step === "welcome" || lesson.step === "thanks";
  const transition = (index + (stepEditor === "choose" ? 1 : stepEditor === "configure" ? 2 : 0)) % 2 ? "b" : "a";
  const targetSelector = lesson.step === "create" ? ".home-create" : lesson.step === "details" ? ".workflow-create-form input" : lesson.step === "addWebsite" ? stepEditor === "closed" ? ".editor-plus" : stepEditor === "choose" ? ".step-options" : values.step ? ".step-save" : ".step-fields" : lesson.step === "run" ? ".editor-play" : lesson.step === "result" ? ".run-layout" : lesson.step === "back" ? ".run-header button" : lesson.step === "history" ? '[aria-label="Run history"]' : lesson.step === "settings" ? '[aria-label="Settings"]' : ".timezone-settings";
  const advance = useCallback(() => setIndex(i => Math.min(i + 1, lessons.length - 1)), []);
  const matches = (definition: Definition) => {
    const [navigate, type] = definition.steps;
    let google = false;
    if (navigate?.type === "navigate") try { const url = new URL(navigate.url); google = url.protocol === "https:" && ["google.com", "www.google.com"].includes(url.hostname); } catch { /* Invalid addresses do not match. */ }
    return { google, complete: google && definition.executionTarget !== "windows" && definition.steps.length === 2 && type?.type === "type" && type.text === "hello" && Boolean(type.target?.toLowerCase().includes("search")) };
  };
  async function createWorkflow() {
    if (creatingRef.current || createUncertain || !values.name.trim()) return;
    if (workflow) { advance(); return; }
    creatingRef.current = true; setCreating(true); setError("");
    try {
      const created = await request<Workflow>("workflows", { body: { name: values.name.trim(), description: values.description, executionTarget: "browser", inputs: [], steps: [] } });
      setWorkflow(created); advance();
    } catch (problem) {
      const uncertain = !(problem instanceof RequestError) || problem.status >= 500;
      setCreateUncertain(uncertain);
      setError(uncertain ? "The workflow may have been created. Check your workflow list before trying again." : problem.message);
    } finally { creatingRef.current = false; setCreating(false); }
  }
  async function stepSaved() {
    if (!workflow) return;
    let current: Workflow;
    try { current = await request<Workflow>(`workflows/${workflow.id}`); }
    catch { setError("The step was saved, but the workflow could not be refreshed. Reopen the step and try again."); return; }
    setWorkflow(current);
    const result = matches(current.definition);
    if (!result.google || current.definition.steps.length > 2) { setError("Make the first step open https://www.google.com and remove any extra steps."); return; }
    if (current.definition.steps.length === 1) { setStage(1); setValues(value => ({ ...value, step: undefined })); setStepEditor("closed"); setError(""); return; }
    if (!result.complete) { setError("Make the second step enter hello in the search bar, then save it."); return; }
    setError(""); setStepEditor("closed"); advance();
  }
  async function startRun(current: Workflow) {
    if (startingRef.current) return;
    if (!matches(current.definition).complete) throw new Error("The Google example needs both required steps before it can run.");
    startingRef.current = true; setError("");
    try {
      runId.current ||= crypto.randomUUID();
      const started = await request<Run>(`workflows/${current.id}/runs`, { body: { id: runId.current, version: current.version, inputs: {}, acknowledgeSecretExposure: false, timeoutMs: 120000 } });
      setRun(started); advance();
    } finally { startingRef.current = false; }
  }
  useLayoutEffect(() => {
    const target = root?.querySelector<HTMLElement>(centered ? ".practice-guide-card" : targetSelector);
    if (!target) { setRect(undefined); return; }
    if (!centered && window.innerWidth <= 760) {
      const bounds = target.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight - 260) target.scrollIntoView({ block: "center", behavior: "auto" });
    }
    const measure = () => { const r = target.getBoundingClientRect(); setRect({ x: r.left, y: r.top, width: r.width, height: r.height }); };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(target);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [index, root, stepEditor, targetSelector, centered]);
  useLayoutEffect(() => {
    setAudioFailed(false);
    const audio = audioRef.current;
    if (!audio || !lesson.audio || muted) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setAudioFailed(true));
    return () => audio.pause();
  }, [lesson.audio, muted, index]);
  const position = rect ? wholePage ? { left: 5, top: 5, width: window.innerWidth - 10, height: window.innerHeight - 10 } : { left: rect.x - 5, top: rect.y - 5, width: rect.width + 10, height: rect.height + 10 } : undefined;
  const cardPosition = !wholePage && !centered && rect ? window.innerWidth > 760 ? {
    left: rect.x >= 390 ? Math.max(16, rect.x - 385) : Math.min(window.innerWidth - 385, rect.x + rect.width + 20),
    top: Math.max(16, Math.min(window.innerHeight - 240, rect.y + rect.height + 20)),
    bottom: "auto", transform: "none",
  } : rect.y + rect.height > window.innerHeight - 260 ? { top: 16, bottom: "auto" } : undefined : undefined;
  return <Dialog.Root open={open} onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Content className="practice-guide" aria-describedby={undefined} ref={setRoot}>
    <Dialog.Title className="guide-sr-only">Openly practice guide</Dialog.Title>
    <div className={`guide-scene guide-transition-${transition}`}><PracticeScene step={lesson.step} advance={advance} values={values} setValues={setValues} stepEditor={stepEditor} setStepEditor={setStepEditor} workflow={workflow} run={run} creating={creating} createUncertain={createUncertain} error={error} createWorkflow={createWorkflow} stepSaved={stepSaved} startRun={startRun} /></div>
    {(centered || (!position && lesson.step !== "addWebsite")) && <div className="guide-shade" aria-hidden="true" />}
    <div className={`guide-highlight${centered || wholePage || !position ? " guide-highlight--hidden" : ""}${lesson.step === "addWebsite" ? " guide-highlight--unshaded" : ""}`} style={position} aria-hidden="true" />
    {rect && !centered && !wholePage && <div className="guide-cursor" style={{ left: Math.min(rect.x + rect.width - 12, window.innerWidth - 28), top: Math.min(rect.y + rect.height - 4, window.innerHeight - 28) }} aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M5 2.5v22l6.1-6.1 4.6 10.1 4-1.8-4.6-9.9h9.1z" fill="white" stroke="#111" strokeWidth="1.7" strokeLinejoin="round" /></svg></div>}
    <section className={`practice-guide-card${centered ? " practice-guide-card--center" : ""}`} style={cardPosition} aria-live="polite"><div className={`guide-copy guide-transition-${transition}`}><span className="guide-label">Getting started</span><h2>{lesson.title}</h2><p>{lesson.step === "addWebsite" ? stage === 0 ? "Add Open a website with https://www.google.com, then click Save step." : "Add Enter text: enter hello, describe the field as the search bar, and click Save step." : lesson.caption}</p>{error && <p className="step-error" role="alert">{error}</p>}</div>
      {lesson.audio && <div className="guide-audio"><audio ref={audioRef} src={lesson.audio} onError={() => setAudioFailed(true)} /><button type="button" onClick={() => setMuted(v => !v)}>{muted ? "Unmute" : "Mute"}</button><button type="button" disabled={muted} onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; void audioRef.current.play().catch(() => setAudioFailed(true)); } }}>Replay narration</button>{audioFailed && <span>Audio unavailable; captions are shown.</span>}</div>}
      <div className="guide-controls"><button type="button" className="guide-quiet" disabled={index === 0 || creating} onClick={() => setIndex(i => Math.max(i - 1, 0))}>Back</button><button type="button" className="guide-primary" disabled={["create", "details", "addWebsite", "run", "settings"].includes(lesson.step)} onClick={index === lessons.length - 1 ? onClose : advance}>{index === lessons.length - 1 ? "Finish" : "Next"}</button><span>{index + 1} / {lessons.length}</span><button type="button" className="guide-skip" disabled={creating} onClick={onClose}>Skip</button></div>
    </section><div className="guide-practice-note">Guide · Creates a real workflow and run</div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
