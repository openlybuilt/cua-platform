"use client";

import { useEffect, useState } from "react";

export type VMType = "browser" | "windows";
export type ProviderCapability = { id: string; executionTargets: VMType[] };
export function providerName(id: string): string {
  if (id === "onkernel") return "OnKernel";
  if (id === "daytona") return "Daytona";
  return id;
}
export function vmName(target: VMType): string { return target === "browser" ? "Browser VM" : "Computer VM (Windows)"; }
export function defaultProvider(target: VMType): string { return target === "browser" ? "onkernel" : "daytona"; }

export function useProviderCapabilities() {
  const [providers, setProviders] = useState<ProviderCapability[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/provider-capabilities", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) });
        if (!response.ok) throw new Error("Provider capabilities unavailable");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("providers" in data) || !Array.isArray(data.providers)) throw new Error("Invalid capabilities");
        const valid: ProviderCapability[] = [];
        for (const item of data.providers) {
          if (!item || typeof item !== "object" || typeof item.id !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(item.id) || !Array.isArray(item.executionTargets)) continue;
          const executionTargets = item.executionTargets.filter((target: unknown): target is VMType => target === "browser" || target === "windows");
          if (executionTargets.length) valid.push({ id: item.id, executionTargets });
        }
        if (!controller.signal.aborted) { setProviders(valid); setStatus("ready"); }
      } catch { if (!controller.signal.aborted) { setProviders([]); setStatus("error"); } }
    }
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  return { providers, status };
}
