
const unavailable = () => Response.json({ status: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });

export async function GET() {
  const backend = process.env.BACKEND_URL;
  if (!backend) return unavailable();
  try {
    const response = await fetch(`${backend.replace(/\/+$/, "")}/app-availability`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return unavailable();
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("status" in data) || data.status !== "available") return unavailable();
    const targets = "executionTargets" in data && Array.isArray(data.executionTargets)
      ? data.executionTargets.filter((item): item is "browser" | "windows" => item === "browser" || item === "windows")
      : [];
    if (!targets.length) return unavailable();
    return Response.json({ status: "available", executionTargets: targets }, { headers: { "cache-control": "no-store" } });
  } catch {
    return unavailable();
  }
}
