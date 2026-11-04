import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { authConfigured } from "./lib/auth-config";

const clerk = clerkMiddleware();
export default function proxy(...args: Parameters<typeof clerk>) {
  return authConfigured() ? clerk(...args) : NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)", "/(api)(.*)"],
};
