import type { NextRequest } from "next/server";
import { backendRequest } from "@/lib/backend-request";
export const GET = (request: NextRequest) => backendRequest(request, "workflows");
export const POST = (request: NextRequest) => backendRequest(request, "workflows");
