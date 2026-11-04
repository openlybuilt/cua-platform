import { NextRequest } from "next/server";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export async function backendRequest(request: NextRequest, path: string): Promise<Response> {
  const backend = process.env.BACKEND_URL;
  if (!backend) return error("Some services are currently unavailable.", 503);
  if (request.method !== "GET" && request.method !== "HEAD") {
    const expected = process.env.UI_ORIGIN ?? request.nextUrl.origin;
    if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") return error("Invalid origin.", 403);
    if (request.method !== "DELETE" && !/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) return error("JSON content type required.", 415);
  }
  try {
    let body: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE") {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 1024 * 1024) return error("Request is too large.", 413);
      body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 1024 * 1024) return error("Request is too large.", 413);
    }
    const headers = new Headers();
    if (body !== undefined) headers.set("content-type", "application/json");
    headers.set("accept-encoding", "identity");
    const range = request.headers.get("range");
    if (range) headers.set("range", range);
    const version = request.headers.get("if-match");
    if (version !== null) headers.set("if-match", version);
    const response = await fetch(`${backend.replace(/\/+$/, "")}/${path}`, {
      method: request.method, headers, body, cache: "no-store", redirect: "error", signal: path.endsWith("/recording") ? request.signal : AbortSignal.timeout(10000),
    });
    if (response.status >= 500) return error("Some services are currently unavailable.", 503);
    const outputHeaders = new Headers({ "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" });
    for (const name of ["content-length", "content-range", "accept-ranges"]) { const value = response.headers.get(name); if (value && (name !== "content-length" || !response.headers.has("content-encoding"))) outputHeaders.set(name, value); }
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers: outputHeaders });
  } catch { return error("Some services are currently unavailable.", 503); }
}

export function validWorkflowId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
