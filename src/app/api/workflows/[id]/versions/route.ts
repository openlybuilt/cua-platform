import type { NextRequest } from "next/server";
import { backendRequest, validWorkflowId } from "@/lib/backend-request";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return validWorkflowId(id) ? backendRequest(request, `workflows/${id}/versions`) : Response.json({ error: "Not found" }, { status: 404 });
}
