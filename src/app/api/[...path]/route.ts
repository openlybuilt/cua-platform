import type { NextRequest } from "next/server";
import { backendRequest } from "@/lib/backend-request";

const routes: { path: RegExp; methods: string[] }[] = [
  { path: /^guide-example-runs$/, methods: ["POST"] },
  { path: /^settings\/timezone$/, methods: ["GET", "POST"] },
  { path: /^settings\/recordings$/, methods: ["GET", "POST"] },
  { path: /^placeholders$/, methods: ["GET", "POST"] },
  { path: /^placeholders\/[A-Za-z][A-Za-z0-9_]{0,49}$/, methods: ["DELETE"] },
  { path: /^workflows\/[0-9a-f-]{36}\/runs$/i, methods: ["GET", "POST"] },
  { path: /^workflows\/[0-9a-f-]{36}\/versions\/[1-9][0-9]{0,9}$/i, methods: ["GET"] },
  { path: /^runs\/[0-9a-f-]{36}\/(?:events)$/i, methods: ["GET"] },
  { path: /^runs\/[0-9a-f-]{36}\/recording$/i, methods: ["GET", "HEAD", "DELETE"] },
  { path: /^runs\/[0-9a-f-]{36}\/cancel$/i, methods: ["POST"] },
  { path: /^runs\/[0-9a-f-]{36}$/i, methods: ["GET"] },
  { path: /^workflows\/[0-9a-f-]{36}\/schedules$/i, methods: ["GET", "POST"] },
  { path: /^schedules\/[0-9a-f-]{36}\/occurrences$/i, methods: ["GET"] },
  { path: /^schedules\/[0-9a-f-]{36}$/i, methods: ["PATCH", "DELETE"] },
];
async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  const route = routes.find((entry) => entry.path.test(path));
  if (!route) return Response.json({ error: "Not found" }, { status: 404 });
  if (!route.methods.includes(request.method)) return Response.json({ error: "Method not allowed" }, { status: 405 });
  return backendRequest(request, path);
}
export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
