"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { request } from "@/lib/workflows/contracts";
type RecordingSettings = { enabled: boolean; stopping: boolean };
export function Recordings({ practice = false }: { practice?: boolean }) {
  const [settings, setSettings] = useState<RecordingSettings | undefined>(practice ? { enabled: true, stopping: false } : undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (practice) return; let active = true; request<RecordingSettings>("settings/recordings").then((value) => { if (active) setSettings(value); }).catch(() => { if (active) setError("Could not load recording settings."); }); return () => { active = false; }; }, [practice]);
  useEffect(() => { if (!settings?.stopping) return; let active = true; const timer = window.setInterval(() => { void request<RecordingSettings>("settings/recordings").then((value) => { if (active) setSettings(value); }).catch(() => { if (active) setError("Could not check whether recordings stopped."); }); }, 2000); return () => { active = false; window.clearInterval(timer); }; }, [settings?.stopping]);
  async function update(enabled: boolean) { if (practice) { setSettings({ enabled, stopping: false }); return; } setBusy(true); setError(""); try { setSettings(await request<RecordingSettings>("settings/recordings", { body: { enabled } })); } catch { setError("Could not update recording settings."); } finally { setBusy(false); } }
  return <section className="settings-values"><div className="settings-values-heading"><h2>Recordings</h2>{settings && <Button disabled={busy || settings.stopping} onClick={() => void update(!settings.enabled)}>{settings.stopping ? "Stopping…" : settings.enabled ? "Turn off" : "Turn on"}</Button>}</div><p>Recordings may contain information shown in the VM. Disabling recordings stops recording active runs.</p>{settings && <p>{settings.enabled ? "Recording is on." : "Recording is off."}</p>}{error && <p role="alert">{error}</p>}</section>;
}
