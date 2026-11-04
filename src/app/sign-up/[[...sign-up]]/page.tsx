import { SignUp } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth-config";

export default function SignUpPage() {
  if (!authConfigured()) return <main className="unavailable"><h1>Some services are currently unavailable.</h1></main>;
  return <main className="auth-page"><SignUp routing="path" path="/sign-up" fallbackRedirectUrl="/" /></main>;
}
