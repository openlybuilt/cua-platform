"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { PracticeScene, type PracticeStep, type PracticeValues } from "./practice-scene";

type Lesson = { step: PracticeStep; title: string; caption: string; audio?: string };
const lessons: Lesson[] = [
  { step: "create", title: "Let’s build a workflow", caption: "Hey, welcome to Openly. Let’s build a workflow together. Start by clicking Create workflow." },
  { step: "details", title: "Give it a name", caption: "Give your workflow a name and choose where it will run. You can change these later." },
  { step: "addWebsite", title: "Add your first step", caption: "Now let’s add a step. Click the plus to choose what happens first." },
  { step: "chooseWebsite", title: "Open a website", caption: "Choose Open a website to start your workflow on a page." },
  { step: "website", title: "Enter the address", caption: "Enter the website address; the step is added automatically." },
  { step: "addClick", title: "Add another step", caption: "Nice. Let's add a Click step by clicking the plus again." },
  { step: "chooseClick", title: "Choose Click", caption: "Let’s add a Click step and tell the AI what to look for." },
  { step: "click", title: "Describe the target", caption: "Describe exactly what you want the AI to click; the step is added automatically." },
  { step: "run", title: "Run the workflow", caption: "That’s your workflow. Click play to see what a run looks like." },
  { step: "result", title: "Watch what happens", caption: "During a real run, you can follow each step and watch the VM. This example is simulated." },
  { step: "history", title: "Review your runs", caption: "Run history is where you can revisit the status, steps, logs and recording." },
  { step: "historyRun", title: "Open a run", caption: "Choose a run to see what happened." },
  { step: "inspectRun", title: "Explore the details", caption: "Here you can review the steps, logs and recording for a real run." },
  { step: "settings", title: "Last stop: Settings", caption: "Open Settings to manage your preferences." },
  { step: "settingsView", title: "You’re all set", caption: "You can come back to this guide from Settings anytime." },
];

type Rect = { x: number; y: number; width: number; height: number };
export function PracticeGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<PracticeValues>({ name: "Check a website", target: "browser", description: "", url: "", click: "" });
  const [rect, setRect] = useState<Rect>();
  const [muted, setMuted] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const lesson = lessons[index]!;
  const advance = useCallback(() => setIndex(i => Math.min(i + 1, lessons.length - 1)), []);
  useLayoutEffect(() => {
    const target = root?.querySelector<HTMLElement>('[data-guide-target="current"]');
    if (!target) { setRect(undefined); return; }
    const measure = () => { const r = target.getBoundingClientRect(); setRect({ x: r.left, y: r.top, width: r.width, height: r.height }); };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(target);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [index, root]);
  useLayoutEffect(() => {
    setAudioFailed(false);
    const audio = audioRef.current;
    if (!audio || !lesson.audio || muted) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setAudioFailed(true));
    return () => audio.pause();
  }, [lesson.audio, muted, index]);
  const position = rect ? { left: rect.x - 5, top: rect.y - 5, width: rect.width + 10, height: rect.height + 10 } : undefined;
  const cardPosition = rect && window.innerWidth > 760 ? {
    left: rect.x >= 390 ? Math.max(16, rect.x - 385) : Math.min(window.innerWidth - 385, rect.x + rect.width + 20),
    top: Math.max(16, Math.min(window.innerHeight - 240, rect.y + rect.height + 20)),
    bottom: "auto", transform: "none",
  } : undefined;
  return <Dialog.Root open={open} onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Content className="practice-guide" aria-describedby={undefined} ref={setRoot}>
    <Dialog.Title className="guide-sr-only">Openly practice guide</Dialog.Title>
    <PracticeScene step={lesson.step} advance={advance} values={values} setValues={setValues} />
    {position && <div className="guide-highlight" style={position} aria-hidden="true" />}
    {rect && <div className="guide-cursor" style={{ left: Math.min(rect.x + rect.width - 12, window.innerWidth - 28), top: Math.min(rect.y + rect.height - 4, window.innerHeight - 28) }} aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M5 2.5v22l6.1-6.1 4.6 10.1 4-1.8-4.6-9.9h9.1z" fill="white" stroke="#111" strokeWidth="1.7" strokeLinejoin="round" /></svg></div>}
    <section className="practice-guide-card" style={cardPosition} aria-live="polite"><span className="guide-label">Getting started</span><h2>{lesson.title}</h2><p>{lesson.caption}</p>
      {lesson.audio && <div className="guide-audio"><audio ref={audioRef} src={lesson.audio} onError={() => setAudioFailed(true)} /><button type="button" onClick={() => setMuted(v => !v)}>{muted ? "Unmute" : "Mute"}</button><button type="button" disabled={muted} onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; void audioRef.current.play().catch(() => setAudioFailed(true)); } }}>Replay narration</button>{audioFailed && <span>Audio unavailable; captions are shown.</span>}</div>}
      <div className="guide-controls"><button type="button" className="guide-quiet" disabled={index === 0} onClick={() => setIndex(i => Math.max(i - 1, 0))}>Back</button><button type="button" className="guide-primary" onClick={index === lessons.length - 1 ? onClose : advance}>{index === lessons.length - 1 ? "Finish" : "Next"}</button><span>{index + 1} / {lessons.length}</span><button type="button" className="guide-quiet" onClick={onClose}>Skip</button></div>
    </section><div className="guide-practice-note">Practice guide · Your workflows won’t be changed</div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
