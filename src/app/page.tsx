import { auth } from "@clerk/nextjs/server";
import { authConfigured } from "@/lib/auth-config";

export const dynamic = "force-dynamic";
export default async function Home() {
  if (!authConfigured()) return <main className="unavailable"><h1>Some services are currently unavailable.</h1></main>;
  await auth.protect();
  return <main className="brand-home"><h1>Openly</h1><p>Computer use</p></main>;
}
