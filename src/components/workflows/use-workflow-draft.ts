"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { request, RequestError, type Definition, type Workflow } from "@/lib/workflows/contracts";

type SaveStatus = "saved" | "pending" | "saving" | "error";
function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalized(item)]));
  return value;
}
const same = (a: Definition, b: Definition) => JSON.stringify(normalized(a)) === JSON.stringify(normalized(b));

export function useWorkflowDraft(initial: Workflow, practice = false) {
  const [draft, setDraft] = useState(initial.definition);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [revision, setRevision] = useState(0);
  const draftRef = useRef(draft);
  const savedRef = useRef(initial);
  const acknowledged = useRef(initial.definition);
  const flight = useRef<Promise<boolean> | null>(null);
  const conflictRef = useRef(false);
  const history = useRef<Definition[]>([]);
  const future = useRef<Definition[]>([]);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const update = useCallback((change: (current: Definition) => Definition, record = true) => {
    const before = draftRef.current;
    const next = change(before);
    if (same(before, next)) return;
    if (record) { history.current.push(before); if (history.current.length > 100) history.current.shift(); future.current = []; }
    draftRef.current = next;
    setDraft(next);
    if (!conflictRef.current) { setMessage(""); setStatus("pending"); }
    setRevision((value) => value + 1);
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    if (flight.current) return flight.current;
    if (conflictRef.current) return Promise.resolve(false);
    const operation = (async () => {
      while (mounted.current && !same(draftRef.current, acknowledged.current)) {
        const snapshot = draftRef.current;
        if (mounted.current) { setStatus("saving"); setMessage(""); }
        try {
          savedRef.current = practice ? { ...savedRef.current, definition: snapshot } : await request<Workflow>(`workflows/${initial.id}/versions`, { body: snapshot, version: savedRef.current.version });
          acknowledged.current = snapshot;
        } catch (problem) {
          const stale = problem instanceof RequestError && problem.status === 409;
          conflictRef.current = stale;
          if (mounted.current) { setConflict(stale); setStatus("error"); setMessage(stale ? "This workflow changed elsewhere. Reload before saving." : problem instanceof Error ? problem.message : "Could not save workflow."); }
          return false;
        }
      }
      if (mounted.current) { setStatus("saved"); setMessage(""); return true; }
      return false;
    })();
    flight.current = operation;
    void operation.finally(() => { if (flight.current === operation) flight.current = null; });
    return operation;
  }, [initial.id, practice]);

  useEffect(() => {
    if (status !== "pending" || conflict) return;
    const timer = window.setTimeout(() => { void flush(); }, 500);
    return () => window.clearTimeout(timer);
  }, [revision, status, conflict, flush]);
  useEffect(() => {
    if (practice) return;
    const warn = (event: BeforeUnloadEvent) => { if (flight.current || !same(draftRef.current, acknowledged.current)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [practice]);
  function undo() {
    const previous = history.current.pop();
    if (!previous) return;
    future.current.push(draftRef.current);
    update(() => previous, false);
  }
  function redo() {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(draftRef.current);
    update(() => next, false);
  }
  return { draft, status, message, conflict, update, flush, undo, redo, canUndo: history.current.length > 0, canRedo: future.current.length > 0 };
}
