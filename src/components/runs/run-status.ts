export function statusTone(status: string): "success" | "error" | "active" | "warning" | "neutral" {
  if (["completed", "succeeded", "success"].includes(status)) return "success";
  if (["failed", "error"].includes(status)) return "error";
  if (["cancelled", "canceled", "interrupted", "stopped", "outcome_unknown", "dispatch_unknown"].includes(status)) return "warning";
  if (["running", "provisioning", "dispatch_pending", "cleaning_up", "cancelling"].includes(status)) return "active";
  return "neutral";
}
export function statusLabel(status: string): string {
  if (["cancelled", "canceled", "interrupted", "stopped"].includes(status)) return "Stopped";
  if (["completed", "succeeded", "success"].includes(status)) return "Completed";
  if (status === "failed" || status === "error") return "Failed";
  const label = status.replaceAll("_", " ").trim();
  return label ? label[0]!.toUpperCase() + label.slice(1) : "Unknown";
}
