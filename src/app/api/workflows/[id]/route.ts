import type { NextRequest } from "next/server";
import { backendRequest, validWorkflowId } from "@/lib/backend-request";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return validWorkflowId(id) ? backendRequest(request, `workflows/${id}`) : Response.json({ error: "Not found" }, { status: 404 });
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return validWorkflowId(id) ? backendRequest(request, `workflows/${id}`) : Response.json({ error: "Not found" }, { status: 404 });
}
