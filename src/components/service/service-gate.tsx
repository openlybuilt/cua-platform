"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Loading } from "@/components/ui/loading";

type Availability = "checking" | "available" | "unavailable";
const ServiceAvailability = createContext(false);
export function useServiceAvailable() { return useContext(ServiceAvailability); }
type ExecutionTarget = "browser" | "windows";
const ExecutionTargets = createContext<ExecutionTarget[]>([]);
export function useExecutionTargets() { return useContext(ExecutionTargets); }

export function ServiceGate({ children }: { children: ReactNode }) {
  const [availability, setAvailability] = useState<Availability>("checking");
  const [hasConnected, setHasConnected] = useState(false);
  const [targets, setTargets] = useState<ExecutionTarget[]>([]);
  const checking = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      if (checking.current || controller.signal.aborted) return;
      checking.current = true;
      try {
        const response = await fetch("/api/app-availability", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        });
        if (controller.signal.aborted) return;
        if (!response.ok) { setAvailability("unavailable"); return; }
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("status" in data) || data.status !== "available") {
          setAvailability("unavailable"); return;
        }
        const next = "executionTargets" in data && Array.isArray(data.executionTargets) ? data.executionTargets.filter((item): item is ExecutionTarget => item === "browser" || item === "windows") : [];
        setTargets((current) => current.length === next.length && current.every((value, index) => value === next[index]) ? current : next);
        setHasConnected(true);
        setAvailability("available");
      } catch {
        if (!controller.signal.aborted) setAvailability("unavailable");
      } finally { checking.current = false; }
    }
    const onUnavailable = () => setAvailability("unavailable");
    const onVisibility = () => { if (!document.hidden) void check(); };
    void check();
    const timer = window.setInterval(check, 3000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("openly:service-unavailable", onUnavailable);
    window.addEventListener("online", check);
    window.addEventListener("focus", check);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("openly:service-unavailable", onUnavailable);
      window.removeEventListener("online", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return <>
    {hasConnected && <ServiceAvailability.Provider value={availability === "available"}><ExecutionTargets.Provider value={targets}><div hidden={availability !== "available"}>{children}</div></ExecutionTargets.Provider></ServiceAvailability.Provider>}
    {availability !== "available" && <main className="unavailable" aria-live="polite">
      {availability === "checking" ? <Loading label="Checking services" /> : <div><h1>Some services are currently unavailable.</h1><p>We’ll reconnect automatically when they’re back.</p></div>}
    </main>}
  </>;
}
