"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { request, prewarmPlaceholderNames, type Workflow } from "@/lib/workflows/contracts";
const api = <T,>(path: string) => request<T>(path);
import { ScheduleList } from "./schedule-list";
import { Select } from "@/components/ui/select";
import {
  loadTimezone,
  intervalLabel,
  weeklyLabel,
  ScheduleRequestError,
  scheduleRequest,
  scheduledInstant,
  type Schedule,
  type ScheduleOccurrence,
} from "@/lib/scheduling/schedules";
type Placeholder = { name: string; secret: boolean };
type Review = {
  id: string;
  version: number;
  secretNames: string[];
  missing: string[];
};
type CreateRequest = {
  kind: "once" | "interval" | "weekly";
  runAt?: string;
  intervalMinutes?: number;
  weekdays?: number[];
  localTime?: string;
  recordingEnabled: boolean;
  idempotencyKey: string;
  acknowledgeSecretExposure?: boolean;
  acknowledgedWorkflowVersion?: number;
};
function secretInfo(workflow: Workflow, placeholders: Placeholder[]) {
  const used = workflow.definition.inputs;
  return {
    secretNames: used.filter((name) =>
      placeholders.some((item) => item.name === name && item.secret),
    ),
    missing: [...new Set([...used, ...prewarmPlaceholderNames(workflow.definition.prewarm)])].filter(
      (name) => !placeholders.some((item) => item.name === name),
    ),
  };
}
export function ScheduleDialog({
  open,
  onOpenChange,
  workflow,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: Workflow;
  returnFocus: () => void;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timezone, setTimezone] = useState("");
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [recordingsAllowed, setRecordingsAllowed] = useState(false);
  const [kind, setKind] = useState<"once" | "interval">("once");
  const [localDate, setLocalDate] = useState("");
  const [localTime, setLocalTime] = useState("");
  const [recurrence, setRecurrence] = useState<"interval" | "weekly">("interval");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [weeklyTime, setWeeklyTime] = useState("");
  const [interval, setInterval] = useState("1");
  const [unit, setUnit] = useState("60");
  const [acknowledged, setAcknowledged] = useState(false);
  const [review, setReview] = useState<Review>();
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const [occurrences, setOccurrences] = useState<
    Record<string, ScheduleOccurrence[]>
  >({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshProblem, setRefreshProblem] = useState(false);
  const [pendingCreate, setPendingCreate] = useState<CreateRequest>();
  const mounted = useRef(false);
  const submitting = useRef(false);
  const refreshGeneration = useRef(0);
  const storageKey = `virela:schedule-create:${workflow.id}`;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    const result = await scheduleRequest<{ schedules: Schedule[] }>(
      `workflows/${workflow.id}/schedules`,
    );
    if (mounted.current && generation === refreshGeneration.current)
      setSchedules(result.schedules);
  }, [workflow.id]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setTimezone("");
    setSchedules([]);
    setPlaceholders([]);
    setError("");
    setAcknowledged(false);
    setReview(undefined);
    setOccurrences({});
    try {
      const stored = sessionStorage.getItem(storageKey);
      setPendingCreate(
        stored ? (JSON.parse(stored) as CreateRequest) : undefined,
      );
    } catch {
      setError("Could not recover a pending schedule request.");
      setLoading(false);
      return () => {
        active = false;
      };
    }
    Promise.all([
      scheduleRequest<{ schedules: Schedule[] }>(
        `workflows/${workflow.id}/schedules`,
      ),
      loadTimezone(),
      api<Placeholder[]>("placeholders"),
      api<{ enabled: boolean }>("settings/recordings"),
    ])
      .then(([list, preference, savedPlaceholders, recordings]) => {
        if (!active) return;
        setSchedules(list.schedules);
        setTimezone(preference);
        setPlaceholders(savedPlaceholders);
        setRecordingsAllowed(recordings.enabled);
        setRecordingEnabled(recordings.enabled);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError(
            "Could not load schedules and settings. Close and try again.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open, workflow.id, storageKey]);

  useEffect(() => {
    if (!open || loading || busy) return;
    const check = () => {
      if (document.hidden) return;
      void refresh().then(() => { if (mounted.current) setRefreshProblem(false); }).catch(() => { if (mounted.current) setRefreshProblem(true); });
    };
    const timer = window.setInterval(check, 5000);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [open, loading, busy, refresh]);
  const { secretNames, missing } = secretInfo(workflow, placeholders);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    try {
      let payload = pendingCreate;
      if (!payload) {
        if (missing.length)
          throw new Error(
            "Save all required placeholders in Settings before scheduling.",
          );
        if (secretNames.length && !acknowledged)
          throw new Error(
            "Confirm that the scheduled run can use the listed secrets.",
          );
        let timing:
          | { kind: "once"; runAt: string }
          | { kind: "interval"; intervalMinutes: number }
          | { kind: "weekly"; weekdays: number[]; localTime: string };
        if (kind === "once") {
          const runAt = scheduledInstant(`${localDate}T${localTime}`, timezone);
          if (Date.parse(runAt) <= Date.now())
            throw new Error("Choose a future time.");
          timing = { kind, runAt };
        } else if (recurrence === "weekly") {
          if (!weekdays.length || !weeklyTime) throw new Error("Choose at least one day and a time.");
          timing = { kind: "weekly", weekdays, localTime: weeklyTime };
        } else {
          const intervalMinutes = Number(interval) * Number(unit);
          if (
            !Number.isInteger(Number(interval)) ||
            !Number.isInteger(intervalMinutes) ||
            intervalMinutes < 1 ||
            intervalMinutes > 525600
          )
            throw new Error(
              "Choose an interval between one minute and 365 days.",
            );
          timing = { kind, intervalMinutes };
        }
        payload = {
          ...timing,
          recordingEnabled,
          idempotencyKey: crypto.randomUUID(),
          ...(secretNames.length
            ? {
                acknowledgeSecretExposure: true,
                acknowledgedWorkflowVersion: workflow.version,
              }
            : {}),
        };
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(payload));
        } catch {
          throw new Error(
            "Could not save this scheduling request safely. Please check browser storage and try again.",
          );
        }
        setPendingCreate(payload);
      }
      refreshGeneration.current++; setBusy(true);
      await scheduleRequest(
        `workflows/${workflow.id}/schedules`,
        "POST",
        payload,
      );
      sessionStorage.removeItem(storageKey);
      setPendingCreate(undefined);
      setLocalDate("");
      setLocalTime("");
      setAcknowledged(false);
      try {
        await refresh();
      } catch {
        setError(
          "Schedule created, but the list could not be refreshed. Close and reopen to see it.",
        );
      }
    } catch (e) {
      if (
        e instanceof ScheduleRequestError &&
        ([400, 401, 403, 404, 405, 415].includes(e.status) ||
          (e.status === 409 &&
            [
              "workflow_version_changed",
              "secret_acknowledgment_required",
              "idempotency_conflict",
              "schedule_deleted",
              "invalid_workflow",
            ].includes(e.code ?? "")))
      ) {
        sessionStorage.removeItem(storageKey);
        setPendingCreate(undefined);
      }
      setError(e instanceof Error ? e.message : "Could not create schedule.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function update(id: string, body: unknown) {
    refreshGeneration.current++; setBusy(true);
    setError("");
    try {
      await scheduleRequest(`schedules/${id}`, "PATCH", body);
      setReview(undefined);
      setReviewAcknowledged(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update schedule.");
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    refreshGeneration.current++; setBusy(true);
    setError("");
    try {
      await scheduleRequest(`schedules/${id}`, "DELETE");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove schedule.");
    } finally {
      setBusy(false);
    }
  }
  async function showOccurrences(id: string) {
    if (occurrences[id]) {
      setOccurrences((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const result = await scheduleRequest<{
        occurrences: ScheduleOccurrence[];
      }>(`schedules/${id}/occurrences`);
      if (mounted.current)
        setOccurrences((current) => ({ ...current, [id]: result.occurrences }));
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "Could not load scheduled runs.",
        );
    }
  }
  async function reviewSecrets(id: string) {
    refreshGeneration.current++; setBusy(true);
    setError("");
    try {
      const [latest, savedPlaceholders] = await Promise.all([
        api<Workflow>(`workflows/${workflow.id}`),
        api<Placeholder[]>("placeholders"),
      ]);
      setReview({
        id,
        version: latest.version,
        ...secretInfo(latest, savedPlaceholders),
      });
      setReviewAcknowledged(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not review workflow secrets.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content schedule-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus();
          }}
        >
          <div className="dialog-heading">
            <div>
              <Dialog.Title>Schedule workflow</Dialog.Title>
              <Dialog.Description>
                Runs use the latest saved workflow.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="Close" disabled={busy}>
              ×
            </Dialog.Close>
          </div>
          {loading ? (
            <p className="hint">Loading schedules…</p>
          ) : !timezone ? null : (
            <>
              <form onSubmit={create} className="schedule-form">
                {pendingCreate ? (
                  <div className="schedule-field">
                    <span>
                      Pending request:{" "}
                      {pendingCreate.kind === "once" && pendingCreate.runAt
                        ? `Once at ${new Intl.DateTimeFormat(undefined, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(pendingCreate.runAt))} (${timezone})`
                        : pendingCreate.kind === "weekly" ? weeklyLabel(pendingCreate.weekdays, pendingCreate.localTime) : intervalLabel(pendingCreate.intervalMinutes)}
                    </span>
                    <small>
                      Recording:{" "}
                      {pendingCreate.recordingEnabled ? "requested" : "off"}
                    </small>
                  </div>
                ) : (
                  <>
                    <fieldset disabled={!!pendingCreate || busy}>
                      <legend>When should it run?</legend>
                      <label className="schedule-choice">
                        <input
                          type="radio"
                          name="schedule-kind"
                          checked={kind === "once"}
                          onChange={() => setKind("once")}
                        />
                        <span><strong>Once</strong><small>At a specific time</small></span>
                      </label>
                      <label className="schedule-choice">
                        <input
                          type="radio"
                          name="schedule-kind"
                          checked={kind === "interval"}
                          onChange={() => setKind("interval")}
                        />
                        <span><strong>Recurring</strong><small>Repeat on days or at an interval</small></span>
                      </label>
                    </fieldset>
                    {kind === "once" ? (
                      <div className="schedule-field">
                        <div className="schedule-date-time">
                          <label className="schedule-field">
                            Date
                            <input
                              type="date"
                              value={localDate}
                              disabled={!!pendingCreate || busy}
                              onChange={(e) => setLocalDate(e.target.value)}
                              required
                            />
                          </label>
                          <label className="schedule-field">
                            Time
                            <input
                              type="time"
                              value={localTime}
                              disabled={!!pendingCreate || busy}
                              onChange={(e) => setLocalTime(e.target.value)}
                              required
                            />
                          </label>
                        </div>
                        <small>
                          Time zone: {timezone}. Change it in Settings.
                        </small>
                      </div>
                    ) : (
                      <div className="schedule-field">
                        <div className="schedule-field">
                          <label htmlFor="schedule-recurrence">Repeat</label>
                          <Select id="schedule-recurrence" label="Repeat" value={recurrence} onChange={(value) => setRecurrence(value as "interval" | "weekly")} disabled={busy} options={[{value:"interval",label:"At an interval"},{value:"weekly",label:"On selected days"}]} />
                        </div>
                        {recurrence === "weekly" ? (
                          <div className="schedule-field">
                            <span>Days</span>
                            <div className="schedule-weekdays">
                              {[[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"]].map(([day, name]) => (
                                <label key={day} className="schedule-day"><input type="checkbox" checked={weekdays.includes(day as number)} disabled={busy} onChange={(event) => setWeekdays((previous) => event.target.checked ? [...previous, day as number].sort() : previous.filter((value) => value !== day))} />{name}</label>
                              ))}
                            </div>
                            <label className="schedule-field">Time<input type="time" value={weeklyTime} required disabled={busy} onChange={(event) => setWeeklyTime(event.target.value)} /></label>
                            <small>Time zone: {timezone}. Change it in Settings.</small>
                          </div>
                        ) : <div className="schedule-field">
                        Repeat every
                        <div className="schedule-interval">
                          <label>
                            <span className="sr-only">Interval</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={interval}
                              disabled={!!pendingCreate || busy}
                              onChange={(e) => setInterval(e.target.value)}
                              required
                            />
                          </label>
                          <div className="schedule-unit">
                            <Select label="Unit" value={unit} disabled={!!pendingCreate || busy} onChange={setUnit} options={[{value:"1",label:"Minutes"},{value:"60",label:"Hours"},{value:"1440",label:"Days"}]} />
                          </div>
                        </div>
                        <small>
                          First run starts after one interval. Runs wait for any
                          earlier run to finish. A day is 24 elapsed hours, so
                          local time can shift when clocks change.
                        </small>
                        </div>}
                      </div>
                    )}
                    <label className="schedule-check">
                      <input
                        type="checkbox"
                        checked={recordingEnabled}
                        disabled={!recordingsAllowed || !!pendingCreate || busy}
                        onChange={(e) => setRecordingEnabled(e.target.checked)}
                      />{" "}
                      Record scheduled runs
                    </label>
                    {!recordingsAllowed && (
                      <p className="hint">Recording is off in Settings.</p>
                    )}
                    {missing.length > 0 && (
                      <p className="error" role="alert">
                        Save required placeholders in Settings:{" "}
                        {missing.join(", ")}.
                      </p>
                    )}
                    {!pendingCreate && secretNames.length > 0 && (
                      <label className="schedule-check">
                        <input
                          type="checkbox"
                          checked={acknowledged}
                          disabled={busy}
                          onChange={(e) => setAcknowledged(e.target.checked)}
                        />{" "}
                        I allow scheduled runs to use these secrets:{" "}
                        {secretNames.join(", ")}. They may appear on screen, in
                        recordings, or in AI requests.
                      </label>
                    )}
                  </>
                )}
                {pendingCreate && (
                  <p className="schedule-warning" role="status">
                    The last request may have succeeded. Retry it to confirm
                    without creating a duplicate.
                  </p>
                )}
                <div className="schedule-create">
                  <button
                    className="button"
                    disabled={
                      busy ||
                      (!pendingCreate &&
                        (missing.length > 0 ||
                          (secretNames.length > 0 && !acknowledged)))
                    }
                  >
                    {pendingCreate ? "Retry schedule" : "Create schedule"}
                  </button>
                </div>
              </form>
              <ScheduleList
                schedules={schedules}
                timezone={timezone}
                busy={busy || !!pendingCreate}
                review={review}
                reviewAcknowledged={reviewAcknowledged}
                setReviewAcknowledged={setReviewAcknowledged}
                occurrences={occurrences}
                reviewSecrets={reviewSecrets}
                update={update}
                showOccurrences={showOccurrences}
                remove={remove}
              />
              {refreshProblem && <p className="error" role="status">Could not refresh schedule status. Trying again…</p>}
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
