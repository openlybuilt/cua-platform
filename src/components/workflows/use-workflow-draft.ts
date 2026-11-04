"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { request, RequestError, type Definition, type Workflow } from "@/lib/workflows/contracts";

type SaveStatus = "saved" | "pending" | "saving" | "error";
const same = (a: Definition, b: Definition) => JSON.stringify(a) === JSON.stringify(b);

export function useWorkflowDraft(initial: Workflow) {
  const [draft, setDraft] = useState(initial.definition);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [revision, setRevision] = useState(0);
  const draftRef = useRef(draft);
  const savedRef = useRef(initial);
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
      while (!same(draftRef.current, savedRef.current.definition)) {
        const snapshot = draftRef.current;
        if (mounted.current) { setStatus("saving"); setMessage(""); }
        try {
          savedRef.current = await request<Workflow>(`workflows/${initial.id}/versions`, { body: snapshot, version: savedRef.current.version });
        } catch (problem) {
          const stale = problem instanceof RequestError && problem.status === 409;
          conflictRef.current = stale;
          if (mounted.current) { setConflict(stale); setStatus("error"); setMessage(stale ? "This workflow changed elsewhere. Reload before saving." : problem instanceof Error ? problem.message : "Could not save workflow."); }
          return false;
        }
      }
      if (mounted.current) { setStatus("saved"); setMessage(""); }
      return true;
    })();
    flight.current = operation;
    void operation.finally(() => { if (flight.current === operation) flight.current = null; });
    return operation;
  }, [initial.id]);

  useEffect(() => {
    if (status !== "pending" || conflict) return;
    const timer = window.setTimeout(() => { void flush(); }, 500);
    return () => window.clearTimeout(timer);
  }, [revision, status, conflict, flush]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (flight.current || !same(draftRef.current, savedRef.current.definition)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
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
