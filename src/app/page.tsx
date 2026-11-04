import { auth } from "@clerk/nextjs/server";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { ServiceGate } from "@/components/service/service-gate";
import { authConfigured } from "@/lib/auth-config";

export const dynamic = "force-dynamic";
export default async function Home() {
  if (!authConfigured()) return <main className="unavailable"><h1>Some services are currently unavailable.</h1></main>;
  await auth.protect();
  return <ServiceGate><WorkspaceShell /></ServiceGate>;
}
