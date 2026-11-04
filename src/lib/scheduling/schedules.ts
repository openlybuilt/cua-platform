import { serviceFetch } from "./service-fetch";
export type Schedule = {
  id: string;
  workflowId: string;
  kind: "once" | "interval" | "weekly";
  runAt: string | null;
  intervalMinutes: number | null;
  weekdays: number[] | null;
  localTime: string | null;
  enabled: boolean;
  nextRunAt: string | null;
  status: "active" | "paused" | "completed" | "failed" | "missed" | "needs_attention";
  issue:
    | "missing_placeholders"
    | "secret_acknowledgment_required"
    | "dispatch_unknown"
    | "invalid_workflow"
    | null;
  lastRunId: string | null;
  createdAt: string;
  secretNames: string[];
};
export type ScheduleOccurrence = {
  id: string;
  scheduledAt: string;
  status:
    | "queued"
    | "dispatching"
    | "started"
    | "missed"
    | "failed"
    | "outcome_unknown";
  runId: string | null;
  reason: string | null;
};
export class ScheduleRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}
export async function scheduleRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await serviceFetch(`/api/${path}`, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ScheduleRequestError(
      typeof data.error === "string"
        ? data.error
        : "Could not update schedule.",
      response.status,
      typeof data.code === "string" ? data.code : undefined,
    );
  return data as T;
}
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
export function intervalLabel(minutes: number | null | undefined): string {
  if (!minutes) return "Recurring";
  const [value, unit] = minutes % 1440 === 0 ? [minutes / 1440, "day"] : minutes % 60 === 0 ? [minutes / 60, "hour"] : [minutes, "minute"];
  return `Every ${value} ${unit}${value === 1 ? "" : "s"}`;
}
export async function loadTimezone(): Promise<string> {
  const current = await scheduleRequest<{ timezone: string | null }>(
    "settings/timezone",
  );
  if (current.timezone) return current.timezone;
  const saved = await scheduleRequest<{ timezone: string }>(
    "settings/timezone",
    "POST",
    {
      timezone: browserTimezone(),
      onlyIfUnset: true,
    },
  );
  return saved.timezone;
}
// Resolve a user's wall-clock minute in its selected timezone, independently of the device timezone.
// Reject DST gaps and folds instead of silently choosing a different time.
export function scheduledInstant(local: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error("Choose a date and time.");
  const [, year, month, day, hour, minute] = match.map(Number);
  if (
    year < 100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  )
    throw new Error("Choose a valid date and time.");
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const normalized = new Date(wall);
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  )
    throw new Error("Choose a valid date and time.");
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new Error("Choose a valid time zone in Settings.");
  }
  const wallAt = (timestamp: number) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(timestamp).map((part) => [part.type, part.value]),
    );
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
  };
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 3) {
    const instant = wall + hours * 3_600_000;
    offsets.add(wallAt(instant) - instant);
  }
  const candidates = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => wallAt(instant) === wall);
  if (!candidates.length)
    throw new Error(
      "That time does not exist in this time zone. Choose another time.",
    );
  if (candidates.length > 1)
    throw new Error(
      "That time occurs twice in this time zone. Choose another time.",
    );
  return new Date(candidates[0]).toISOString();
}

export function weeklyLabel(days: number[] | null | undefined, time: string | null | undefined): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${(days ?? []).map((day) => names[day]).join(", ")} at ${time ?? "—"}`;
}
