import { SignIn } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth-config";

export default function SignInPage() {
  if (!authConfigured()) return <main className="unavailable"><h1>Some services are currently unavailable.</h1></main>;
  return <main className="auth-page"><SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/" /></main>;
}
