import { auth } from "@clerk/nextjs/server";
import { authConfigured } from "@/lib/auth-config";

const unavailable = () => Response.json({ status: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });

export async function GET() {
  const backend = process.env.BACKEND_URL;
  if (!authConfigured() || !backend) return unavailable();
  try {
    const session = await auth();
    const token = session.userId ? await session.getToken() : null;
    if (!token) return Response.json({ error: "Sign in required" }, { status: 401, headers: { "cache-control": "no-store" } });
    const response = await fetch(`${backend.replace(/\/+$/, "")}/app-availability`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return response.status === 401 ? Response.json({ error: "Sign in required" }, { status: 401, headers: { "cache-control": "no-store" } }) : unavailable();
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("status" in data) || data.status !== "available") return unavailable();
    const targets = "executionTargets" in data && Array.isArray(data.executionTargets)
      ? data.executionTargets.filter((item): item is "browser" | "windows" => item === "browser" || item === "windows")
      : [];
    return Response.json({ status: "available", executionTargets: targets }, { headers: { "cache-control": "no-store" } });
  } catch {
    return unavailable();
  }
}
