import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { authConfigured } from "@/lib/auth-config";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export async function backendRequest(request: NextRequest, path: string): Promise<Response> {
  const backend = process.env.BACKEND_URL;
  if (!authConfigured() || !backend) return error("Some services are currently unavailable.", 503);
  if (request.method !== "GET") {
    const expected = process.env.UI_ORIGIN ?? request.nextUrl.origin;
    if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") return error("Invalid origin.", 403);
    if (request.method !== "DELETE" && !/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) return error("JSON content type required.", 415);
  }
  try {
    const session = await auth();
    const token = session.userId ? await session.getToken() : null;
    if (!token) return error("Sign in required.", 401);
    let body: string | undefined;
    if (request.method !== "GET" && request.method !== "DELETE") {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 1024 * 1024) return error("Request is too large.", 413);
      body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 1024 * 1024) return error("Request is too large.", 413);
    }
    const headers = new Headers({ authorization: `Bearer ${token}` });
    if (body !== undefined) headers.set("content-type", "application/json");
    const version = request.headers.get("if-match");
    if (version !== null) headers.set("if-match", version);
    const response = await fetch(`${backend.replace(/\/+$/, "")}/${path}`, {
      method: request.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (response.status >= 500) return error("Some services are currently unavailable.", 503);
    return new Response(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
  } catch { return error("Some services are currently unavailable.", 503); }
}

export function validWorkflowId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
