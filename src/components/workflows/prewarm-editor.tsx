"use client";

import { useEffect, useState } from "react";
import type { PrewarmStep } from "@/lib/workflows/contracts";
import { Select } from "@/components/ui/select";
type Placeholder = { name: string; secret: boolean };

const labels: Record<PrewarmStep["type"], string> = {
  goto: "Open a website",
  fill: "Fill a field",
  click: "Click an element",
  wait_for: "Wait for signed-in screen",
};
function blankStep(type: PrewarmStep["type"]): PrewarmStep {
  if (type === "goto") return { type, url: "" };
  if (type === "fill") return { type, selector: "", placeholder: "" };
  if (type === "click") return { type, selector: "" };
  return { type, selector: "", timeout: 30000 };
}
function problem(steps: PrewarmStep[], placeholders: Placeholder[]): string {
  if (!steps.length) return "";
  if (
    steps.length < 2 ||
    steps.length > 30 ||
    steps[0].type !== "goto" ||
    steps.at(-1)?.type !== "wait_for"
  )
    return "Start with Open a website and finish with Wait for signed-in screen.";
  for (const step of steps) {
    if (step.type === "goto") {
      try {
        const url = new URL(step.url);
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          step.url.length > 2048
        )
          throw new Error();
      } catch {
        return "Enter a valid HTTPS address for each website.";
      }
    } else {
      if (!step.selector.trim() || step.selector.length > 2048)
        return "Enter a CSS selector for each field, click, and wait step.";
      if (
        step.type === "fill" &&
        !placeholders.some((item) => item.name === step.placeholder)
      )
        return "Choose an existing placeholder for each fill step.";
      if (
        step.type === "wait_for" &&
        (!Number.isInteger(step.timeout) ||
          step.timeout < 1 ||
          step.timeout > 30000)
      )
        return "Wait time must be between 1 and 30 seconds.";
    }
  }
  return "";
}
export function PrewarmEditor({
  initial,
  placeholders,
  loading,
  error: loadError,
  onSave,
  onDirtyChange,
}: {
  initial?: PrewarmStep[];
  placeholders: Placeholder[];
  loading: boolean;
  error: string;
  onSave: (steps: PrewarmStep[]) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [steps, setSteps] = useState<PrewarmStep[]>(() => initial ?? []);
  const [selected, setSelected] = useState(0);
  const [newType, setNewType] = useState<PrewarmStep["type"]>("goto");
  const [error, setError] = useState("");
  useEffect(() => {
    setSteps(initial ?? []);
    setSelected((current) => Math.min(current, Math.max(0, (initial?.length ?? 0) - 1)));
  }, [initial]);
  const dirty = JSON.stringify(steps) !== JSON.stringify(initial ?? []);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  const step = steps[selected];
  function update(next: PrewarmStep) {
    setSteps((current) =>
      current.map((value, index) => (index === selected ? next : value)),
    );
    setError("");
  }
  function move(offset: number) {
    const to = selected + offset;
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    [next[selected], next[to]] = [next[to], next[selected]];
    setSteps(next);
    setSelected(to);
    setError("");
  }
  function save() {
    if (loading || loadError) {
      setError("Wait for placeholders to load before saving.");
      return;
    }
    const message = problem(steps, placeholders);
    if (message) {
      setError(message);
      return;
    }
    onSave(steps);
    setError("");
  }
  return (
    <section className="prewarm-editor" aria-label="Prewarming setup">
      <div className="prewarm-heading">
        <div>
          <h2>Prewarming</h2>
          <p>Prepare the browser before this workflow runs.</p>
        </div>
        <span>
          {dirty
            ? "Unsaved setup"
            : steps.length
              ? "Configured"
              : "Not configured"}
        </span>
      </div>
      <div className="prewarm-layout">
        <div className="prewarm-list">
          <h3>Setup steps</h3>
          <p>Runs before the workflow</p>
          {steps.length === 0 && (
            <p className="prewarm-empty">
              Add steps to sign in before your workflow starts.
            </p>
          )}
          <ol>
            {steps.map((item, index) => (
              <li key={index}>
                <button
                  type="button"
                  className={index === selected ? "selected" : ""}
                  aria-current={index === selected ? "step" : undefined}
                  onClick={() => setSelected(index)}
                >
                  {index + 1} <span>{labels[item.type]}</span>
                </button>
              </li>
            ))}
          </ol>
          <label htmlFor="prewarm-add-type">Step type</label>
          <Select
            id="prewarm-add-type"
            label="Step type"
            value={newType}
            onChange={(value) => setNewType(value as PrewarmStep["type"])}
            options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
          />
          <button
            type="button"
            className="button button--secondary prewarm-add"
            disabled={steps.length >= 30}
            onClick={() => {
              setSteps([...steps, blankStep(newType)]);
              setSelected(steps.length);
              setError("");
            }}
          >
            ＋ Add step
          </button>
        </div>
        <div className="prewarm-form">
          {step ? (
            <>
              <div className="prewarm-form-heading">
                <div>
                  <h3>{labels[step.type]}</h3>
                  <p>
                    {step.type === "goto"
                      ? "Enter the address of the sign-in page."
                      : step.type === "fill"
                        ? "Choose the field and a saved placeholder."
                        : "Use a CSS selector to identify the element."}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => {
                    setSteps(steps.filter((_, index) => index !== selected));
                    setSelected(Math.max(0, selected - 1));
                    setError("");
                  }}
                >
                  Delete
                </button>
              </div>
              {step.type === "goto" ? (
                <label>
                  Website URL
                  <input
                    type="url"
                    value={step.url}
                    placeholder="https://example.com/login"
                    onChange={(event) =>
                      update({ ...step, url: event.target.value })
                    }
                  />
                </label>
              ) : (
                <label>
                  CSS selector
                  <input
                    value={step.selector}
                    placeholder={
                      step.type === "fill" ? "#username" : "#signed-in"
                    }
                    onChange={(event) =>
                      update({ ...step, selector: event.target.value })
                    }
                  />
                </label>
              )}
              {step.type === "fill" && (
                <label>
                  Placeholder
                  <Select
                    label="Placeholder"
                    value={step.placeholder}
                    onChange={(value) => update({ ...step, placeholder: value })}
                    options={[{ value: "", label: "Select a placeholder" }, ...(step.placeholder && !placeholders.some(item => item.name === step.placeholder) ? [{ value: step.placeholder, label: `${step.placeholder} · Missing` }] : []), ...placeholders.map((item) => ({ value: item.name, label: `${item.name}${item.secret ? " · Secret" : ""}` }))]}
                  />
                  <small>
                    Secret values stay hidden while you edit this step.
                  </small>
                </label>
              )}
              {step.type === "wait_for" && (
                <label>
                  Wait up to (seconds)
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={step.timeout / 1000 || ""}
                    onChange={(event) =>
                      update({
                        ...step,
                        timeout: Number(event.target.value) * 1000,
                      })
                    }
                  />
                </label>
              )}
              <div className="prewarm-order">
                <span>
                  Step {selected + 1} of {steps.length}
                </span>
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={selected === 0}
                  onClick={() => move(-1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={selected === steps.length - 1}
                  onClick={() => move(1)}
                >
                  Move down
                </button>
              </div>
            </>
          ) : (
            <div className="prewarm-empty-detail">
              <h3>Set up prewarming</h3>
              <p>
                Add an action to get started. Finish with a check for the
                signed-in screen.
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="step-error">
              {error}
            </p>
          )}
          {loadError && (
            <p role="alert" className="step-error">
              Could not load placeholders. Try again from the Placeholders page.
            </p>
          )}
          <div className="prewarm-save">
            {dirty && (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setSteps(initial ?? []);
                  setSelected(0);
                  setError("");
                }}
              >
                Discard changes
              </button>
            )}
            <button
              type="button"
              className="button button--primary"
              disabled={!dirty || loading || !!loadError}
              onClick={save}
            >
              Save setup
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
