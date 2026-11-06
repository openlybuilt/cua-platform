"use client";
import { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { loadTimezone, scheduleRequest } from "@/lib/scheduling/schedules";
export function TimezoneSettings({ practice = false }: { practice?: boolean }) {
  const [timezone, setTimezone] = useState("");
  const [zones, setZones] = useState(["UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"]);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    if (typeof Intl.supportedValuesOf === "function") setZones(["UTC", ...Intl.supportedValuesOf("timeZone")]);
    if (practice) { const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; setTimezone(zone); setSaved(zone); setLoaded(true); return; }
    loadTimezone()
      .then((value) => {
        if (!active) return;
        const next = value;
        setTimezone(next);
        setSaved(next);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setError("Could not load your time zone.");
      });
    return () => {
      active = false;
    };
  }, [practice]);
  async function save() {
    const next = timezone.trim();
    try {
      new Intl.DateTimeFormat("en", { timeZone: next });
    } catch {
      setError("Enter a valid time zone, such as America/Denver.");
      return;
    }
    if (practice) { setSaved(next); return; }
    setBusy(true);
    setError("");
    try {
      const result = await scheduleRequest<{ timezone: string }>(
        "settings/timezone",
        "POST",
        { timezone: next },
      );
      setTimezone(result.timezone);
      setSaved(result.timezone);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your time zone.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="timezone-setting">
      <div>
        <span>Time zone</span>
        <p>
          Used for scheduling runs. One-time runs keep their scheduled instant;
          weekday schedules follow this time zone.
        </p>
      </div>
      <div className="timezone-setting-controls">
        <label className="sr-only" htmlFor="workspace-timezone">
          Time zone
        </label>
        <Select
          id="workspace-timezone"
          label="Time zone"
          value={timezone}
          disabled={!loaded || busy}
          onChange={setTimezone}
          options={[...new Set([...(timezone ? [timezone] : []), ...zones])].map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") }))}
        />
        <button
          type="button"
          className="button"
          disabled={!loaded || busy || timezone === saved || !timezone.trim()}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {error && (
          <p className="timezone-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
