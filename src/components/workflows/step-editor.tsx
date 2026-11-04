"use client";

import { useEffect, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import type { Definition, Step } from "@/lib/workflows/contracts";

type Kind = Step["type"];
export const stepChoices: { type: Kind; title: string; icon: string }[] = [
  { type: "navigate", title: "Open a website", icon: "↗" },
  { type: "ai", title: "Ask AI to act", icon: "✦" },
  { type: "type", title: "Enter text", icon: "T" },
  { type: "wait", title: "Wait", icon: "◷" },
  { type: "scroll", title: "Scroll", icon: "↕" },
  { type: "press_keys", title: "Press a key", icon: "↵" },
  { type: "click", title: "Click", icon: "⌖" },
];
const positions = ["Top left", "Top", "Top right", "Middle left", "Middle", "Middle right", "Bottom left", "Bottom", "Bottom right"];

export function stepSummary(step: Step): string {
  switch (step.type) {
    case "navigate": return step.url;
    case "ai": return step.instruction;
    case "type": return step.target ? `${step.text} → ${step.target}` : step.text;
    case "wait": return `${step.seconds} seconds`;
    case "scroll": return "pixels" in step ? `${step.direction} · ${step.pixels} pixels` : `${step.direction} · ${step.wheelTicks} wheel ticks`;
    case "press_keys": return step.keys.join(", ");
    case "click": return "target" in step ? step.target : `${step.x}, ${step.y}`;
  }
}

export function StepEditor({ initial, initialKind, target, onChange, onClose }: {
  initial?: Step; initialKind?: Kind; target: Definition["executionTarget"]; onChange: (step: Step) => void; onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind | undefined>(initial?.type ?? initialKind);
  const [value, setValue] = useState(initial?.type === "navigate" ? initial.url : initial?.type === "ai" ? initial.instruction : initial?.type === "type" ? initial.text : initial?.type === "press_keys" ? initial.keys.join(", ") : initial?.type === "click" && "target" in initial ? initial.target : "");
  const [field, setField] = useState(initial?.type === "type" ? initial.target ?? "" : "");
  const [region, setRegion] = useState(initial?.type === "type" ? initial.region ?? "" : "");
  const [amount, setAmount] = useState(initial?.type === "wait" ? String(initial.seconds) : initial?.type === "scroll" ? String("pixels" in initial ? initial.pixels : initial.wheelTicks) : "");
  const [direction, setDirection] = useState<"up" | "down" | "left" | "right">(initial?.type === "scroll" ? initial.direction : "down");
  const [error, setError] = useState("");
  const saved = useRef(Boolean(initial));
  const legacyText = useRef(initial?.type === "type" && !initial.target);
  const callback = useRef(onChange); callback.current = onChange;
  const coordinate = initial?.type === "click" && "x" in initial ? initial : undefined;
  useEffect(() => {
    if (!kind) return;
    try {
      let step: Step;
      if (kind === "navigate") {
        if (!value.trim() || value.length > 2048) throw Error("Enter a valid URL.");
        if (!/^\{\{[A-Za-z][A-Za-z0-9_]{0,49}\}\}$/.test(value)) { const url = new URL(value); if (!["http:", "https:"].includes(url.protocol)) throw Error("Use an http or https URL."); }
        step = { type: kind, url: value };
      } else if (kind === "ai" || kind === "click") {
        if (kind === "click" && coordinate && !value.trim()) { setError(""); return; }
        if (!value.trim() || value.length > 10000) throw Error("Enter a description.");
        step = kind === "ai" ? { type: kind, instruction: value } : { type: kind, target: value };
      } else if (kind === "type") {
        if (!value || (!field.trim() && !legacyText.current) || value.length > 10000 || field.length > 1000) throw Error("Enter the text and describe its field.");
        step = field.trim() ? { type: kind, text: value, target: field.trim(), ...(region ? { region } : {}) } : { type: kind, text: value };
      } else if (kind === "wait") {
        const seconds = Number(amount);
        if (!amount || !Number.isFinite(seconds) || seconds <= 0 || seconds > 600) throw Error("Choose a duration greater than 0 and at most 600 seconds.");
        step = { type: kind, seconds };
      } else if (kind === "scroll") {
        const number = Number(amount), windows = target === "windows";
        if (!amount || !Number.isInteger(number) || number < 1 || number > (windows ? 100 : 100000)) throw Error(windows ? "Choose 1 to 100 wheel ticks." : "Choose 1 to 100,000 pixels.");
        if (windows) { if (direction !== "up" && direction !== "down") throw Error("Choose up or down."); step = { type: kind, direction, wheelTicks: number }; }
        else step = { type: kind, direction, pixels: number };
      } else {
        const keys = value.split(",").map((key) => key.trim()).filter(Boolean);
        if (!keys.length || keys.length > 10 || keys.some((key) => key.length > 40)) throw Error("Enter up to 10 key presses.");
        step = { type: "press_keys", keys };
      }
      setError(""); callback.current(step); saved.current = true;
    } catch (problem) { setError(saved.current ? problem instanceof Error ? problem.message : "Check this step." : ""); }
  }, [kind, value, field, region, amount, direction, target, coordinate]);

  return <section className="step-editor" aria-label="Step settings">
    <div className="step-editor-heading"><div><h2>{kind ? stepChoices.find((choice) => choice.type === kind)?.title : "Add a step"}</h2><p>{kind ? "Configure what happens in this step." : "Choose what this step should do."}</p></div><button type="button" className="step-close" aria-label="Close step settings" onClick={onClose}>×</button></div>
    {!kind ? <div className="step-options">{stepChoices.map((choice) => <button type="button" key={choice.type} onClick={() => setKind(choice.type)}><span>{choice.icon}</span>{choice.title}</button>)}</div> : <div className="step-fields">
      {(kind === "wait" || kind === "scroll") ? <>
        {kind === "scroll" && <label>Direction<Select label="Direction" value={direction} onChange={(next) => setDirection(next as typeof direction)} options={(target === "windows" ? ["down", "up"] : ["down", "up", "left", "right"]).map((item) => ({ value: item, label: item[0]!.toUpperCase() + item.slice(1) }))} /></label>}
        <label>{kind === "wait" ? "Wait time (seconds)" : target === "windows" ? "Distance (wheel ticks)" : "Distance (pixels)"}<input type="number" min={kind === "wait" ? "0.1" : "1"} max={kind === "wait" ? "600" : target === "windows" ? "100" : "100000"} step={kind === "wait" ? "0.1" : "1"} value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      </> : <label>{kind === "navigate" ? "Website URL" : kind === "ai" ? "Instructions" : kind === "type" ? "Text to enter" : kind === "click" ? "What should the AI click?" : "Keys to press"}
        {(kind === "ai" || kind === "click") ? <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder={kind === "click" ? "e.g. The Sign in button" : "Describe what the AI should do"} /> : <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={kind === "navigate" ? "https://example.com" : kind === "press_keys" ? "Ctrl+l, Return" : "Text to enter"} />}
      </label>}
      {coordinate && kind === "click" && !value && <p className="step-hint">Existing coordinate click: {coordinate.x}, {coordinate.y}.</p>}
      {kind === "type" && <><label>Where should the text go?<input value={field} onChange={(event) => setField(event.target.value)} placeholder="e.g. Email address field" /></label><label>Location on the page<Select label="Location on the page" value={region} onChange={setRegion} options={[{ value: "", label: "No location specified" }, ...(region && !positions.includes(region) ? [{ value: region, label: region }] : []), ...positions.map((item) => ({ value: item, label: item }))]} /></label></>}
      {["navigate", "type", "ai", "click"].includes(kind) && <p className="step-hint">To use a saved value, enter {"{{input_name}}"}.</p>}
      {kind === "press_keys" && <p className="step-hint">Use + for keys together, like Ctrl+Shift+Tab. Separate key presses with commas, like Ctrl+l, Return.</p>}
      {error && <p className="step-error" role="alert">{error}</p>}
    </div>}
  </section>;
}
