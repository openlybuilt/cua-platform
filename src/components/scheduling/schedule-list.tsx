"use client";
import { intervalLabel, weeklyLabel, type Schedule, type ScheduleOccurrence } from "@/lib/scheduling/schedules";
type Review = {
  id: string;
  version: number;
  secretNames: string[];
  missing: string[];
};
type Props = {
  schedules: Schedule[];
  timezone: string;
  busy: boolean;
  review?: Review;
  reviewAcknowledged: boolean;
  setReviewAcknowledged: (value: boolean) => void;
  occurrences: Record<string, ScheduleOccurrence[]>;
  reviewSecrets: (id: string) => Promise<void>;
  update: (id: string, body: unknown) => Promise<void>;
  showOccurrences: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};
function displayTime(value: string | null, timezone: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function displayStatus(schedule: Schedule) {
  if (schedule.status !== "needs_attention") return schedule.status.replaceAll("_", " ");
  if (schedule.issue === "dispatch_unknown") return "outcome unknown";
  if (schedule.issue === "invalid_workflow") return "failed";
  return "action required";
}
function issueText(issue: Schedule["issue"]) {
  switch (issue) {
    case "missing_placeholders":
      return "A required placeholder is missing. Add it in Settings before resuming.";
    case "secret_acknowledgment_required":
      return "This workflow now references additional secrets. Review them before resuming.";
    case "dispatch_unknown":
      return "The last run may have started. Review run history before resuming. It will not be retried; only future occurrences will run.";
    case "invalid_workflow":
      return "The workflow or a saved placeholder is invalid. Fix it before resuming.";
    default:
      return "Review the workflow before resuming this schedule.";
  }
}
export function ScheduleList({
  schedules,
  timezone,
  busy,
  review,
  reviewAcknowledged,
  setReviewAcknowledged,
  occurrences,
  reviewSecrets,
  update,
  showOccurrences,
  remove,
}: Props) {
  return (
    <div className="schedule-list">
      <h3>Scheduled runs</h3>
      {!schedules.length ? (
        <p className="hint">No schedules yet.</p>
      ) : (
        schedules.map((schedule) => (
          <article className="schedule-item" key={schedule.id}>
            <div>
              <strong>
                {schedule.kind === "once"
                  ? "One-time"
                  : schedule.kind === "weekly" ? weeklyLabel(schedule.weekdays, schedule.localTime) : intervalLabel(schedule.intervalMinutes)}
              </strong>
              <p>
                Status: {displayStatus(schedule)} · Next:{" "}
                {displayTime(schedule.status === "active" ? schedule.nextRunAt : null, timezone)}
              </p>
              {schedule.issue && (
                <p className="schedule-warning">{issueText(schedule.issue)}</p>
              )}
            </div>
            <div className="schedule-actions">
              {schedule.issue === "secret_acknowledgment_required" && (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => void reviewSecrets(schedule.id)}
                >
                  Review secrets
                </button>
              )}
              {(schedule.status === "active" || schedule.status === "paused") && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void update(schedule.id, {
                        enabled: !schedule.enabled,
                      })
                    }
                  >
                    {schedule.enabled ? "Pause" : "Resume"}
                  </button>
                )}
              {schedule.status === "needs_attention" &&
                schedule.issue !== "secret_acknowledgment_required" && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => void update(schedule.id, { enabled: true })}
                  >
                    Resume
                  </button>
                )}
              <button
                type="button"
                className="secondary"
                onClick={() => void showOccurrences(schedule.id)}
              >
                {occurrences[schedule.id] ? "Hide runs" : "Show runs"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => void remove(schedule.id)}
              >
                Delete
              </button>
            </div>
            {review?.id === schedule.id && (
              <div className="schedule-review">
                {review.missing.length > 0 && (
                  <p className="error">
                    Missing placeholders: {review.missing.join(", ")}.
                  </p>
                )}
                <label className="schedule-check">
                  <input
                    type="checkbox"
                    checked={reviewAcknowledged}
                    onChange={(e) => setReviewAcknowledged(e.target.checked)}
                  />{" "}
                  I allow scheduled runs to use these secrets:{" "}
                  {review.secretNames.join(", ")}. They may appear on screen, in
                  recordings, or in AI requests.
                </label>
                <button
                  type="button"
                  className="button"
                  disabled={
                    busy || !reviewAcknowledged || review.missing.length > 0
                  }
                  onClick={() =>
                    void update(schedule.id, {
                      acknowledgeSecretExposure: true,
                      acknowledgedWorkflowVersion: review.version,
                    })
                  }
                >
                  Confirm and resume
                </button>
              </div>
            )}
            {occurrences[schedule.id] && (
              <ul className="schedule-occurrences">
                {occurrences[schedule.id].length ? (
                  occurrences[schedule.id].map((item) => (
                    <li key={item.id}>
                      <strong>{displayTime(item.scheduledAt, timezone)}</strong>{" "}
                      · {item.status.replaceAll("_", " ")}
                      {item.reason ? ` · ${item.reason}` : ""}
                    </li>
                  ))
                ) : (
                  <li>No scheduled runs yet.</li>
                )}
              </ul>
            )}
          </article>
        ))
      )}
    </div>
  );
}
