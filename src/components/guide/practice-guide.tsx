"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { PracticeScene, type PracticeStep, type PracticeValues } from "./practice-scene";

type Lesson = { step: PracticeStep; title: string; caption: string; audio?: string };
const lessons: Lesson[] = [
  { step: "create", title: "Let’s build a workflow", caption: "Hey, welcome to Openly. Let’s build a workflow together. Start by clicking Create workflow." },
  { step: "details", title: "Give it a name", caption: "Give your workflow a name and choose where it will run. You can change these later." },
  { step: "addWebsite", title: "Add your first step", caption: "Now let’s add a step. Click the plus to choose what happens first." },
  { step: "run", title: "Run the workflow", caption: "Once you’ve added your steps, click play to run your workflow." },
  { step: "result", title: "Watch what happens", caption: "Here you can watch the VM and follow your workflow’s progress as it runs. This practice run is simulated." },
  { step: "back", title: "Head back", caption: "Let’s head back so I can show you where to find your runs." },
  { step: "history", title: "Run history", caption: "Click Run history to see all of your current and previous runs." },
  { step: "settings", title: "Visit Settings", caption: "Next, click Settings. There are a few useful options I want to show you." },
  { step: "settingsView", title: "Make it yours", caption: "In Settings, you can disable recordings, add placeholders, or watch this guide again whenever you like." },
  { step: "thanks", title: "Thank you!", caption: "Thanks for taking the tour. We hope you enjoy building with Openly!" },
];

type Rect = { x: number; y: number; width: number; height: number };
export function PracticeGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<PracticeValues>({ name: "Check a website", target: "browser", description: "", url: "", click: "" });
  const [stepEditor, setStepEditor] = useState<"closed" | "choose" | "website">("closed");
  const [rect, setRect] = useState<Rect>();
  const [muted, setMuted] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const lesson = lessons[index]!;
  const wholePage = lesson.step === "result" || lesson.step === "settingsView" || lesson.step === "thanks";
  const targetSelector = lesson.step === "create" ? ".home-create" : lesson.step === "details" ? ".workflow-create-form input" : lesson.step === "addWebsite" ? stepEditor === "closed" ? ".editor-plus" : stepEditor === "choose" ? ".step-options button:first-child" : ".step-fields input" : lesson.step === "run" ? ".editor-play" : lesson.step === "result" ? ".run-layout" : lesson.step === "back" ? ".run-header button" : lesson.step === "history" ? '[aria-label="Run history"]' : lesson.step === "settings" ? '[aria-label="Settings"]' : ".timezone-settings";
  const advance = useCallback(() => setIndex(i => Math.min(i + 1, lessons.length - 1)), []);
  useLayoutEffect(() => {
    const target = root?.querySelector<HTMLElement>(targetSelector);
    if (!target) { setRect(undefined); return; }
    const measure = () => { const r = target.getBoundingClientRect(); setRect({ x: r.left, y: r.top, width: r.width, height: r.height }); };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(target);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [index, root, stepEditor, targetSelector]);
  useLayoutEffect(() => {
    setAudioFailed(false);
    const audio = audioRef.current;
    if (!audio || !lesson.audio || muted) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setAudioFailed(true));
    return () => audio.pause();
  }, [lesson.audio, muted, index]);
  const position = rect ? { left: rect.x - 5, top: rect.y - 5, width: rect.width + 10, height: rect.height + 10 } : undefined;
  const cardPosition = !wholePage && rect && window.innerWidth > 760 ? {
    left: rect.x >= 390 ? Math.max(16, rect.x - 385) : Math.min(window.innerWidth - 385, rect.x + rect.width + 20),
    top: Math.max(16, Math.min(window.innerHeight - 240, rect.y + rect.height + 20)),
    bottom: "auto", transform: "none",
  } : undefined;
  return <Dialog.Root open={open} onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Content className="practice-guide" aria-describedby={undefined} ref={setRoot}>
    <Dialog.Title className="guide-sr-only">Openly practice guide</Dialog.Title>
    <PracticeScene step={lesson.step} advance={advance} values={values} setValues={setValues} stepEditor={stepEditor} setStepEditor={setStepEditor} />
    {position && <div className={`guide-highlight${wholePage ? " guide-highlight--page" : ""}`} style={wholePage ? undefined : position} aria-hidden="true" />}
    {rect && <div className="guide-cursor" style={{ left: Math.min(rect.x + rect.width - 12, window.innerWidth - 28), top: Math.min(rect.y + rect.height - 4, window.innerHeight - 28) }} aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M5 2.5v22l6.1-6.1 4.6 10.1 4-1.8-4.6-9.9h9.1z" fill="white" stroke="#111" strokeWidth="1.7" strokeLinejoin="round" /></svg></div>}
    <section className="practice-guide-card" style={cardPosition} aria-live="polite"><span className="guide-label">Getting started</span><h2>{lesson.title}</h2><p>{lesson.step === "addWebsite" && stepEditor === "choose" ? "Choose Open a website to add your first step." : lesson.step === "addWebsite" && stepEditor === "website" ? "Enter a website address to add the step automatically." : lesson.caption}</p>
      {lesson.audio && <div className="guide-audio"><audio ref={audioRef} src={lesson.audio} onError={() => setAudioFailed(true)} /><button type="button" onClick={() => setMuted(v => !v)}>{muted ? "Unmute" : "Mute"}</button><button type="button" disabled={muted} onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; void audioRef.current.play().catch(() => setAudioFailed(true)); } }}>Replay narration</button>{audioFailed && <span>Audio unavailable; captions are shown.</span>}</div>}
      <div className="guide-controls"><button type="button" className="guide-quiet" disabled={index === 0} onClick={() => setIndex(i => Math.max(i - 1, 0))}>Back</button><button type="button" className="guide-primary" disabled={lesson.step === "addWebsite" && !values.url} onClick={index === lessons.length - 1 ? onClose : advance}>{index === lessons.length - 1 ? "Finish" : "Next"}</button><span>{index + 1} / {lessons.length}</span><button type="button" className="guide-quiet" onClick={onClose}>Skip</button></div>
    </section><div className="guide-practice-note">Practice guide · Your workflows won’t be changed</div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
