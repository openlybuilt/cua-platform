import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth-config";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./components.css";
import "./workflows.css";
import "./scheduling.css";

export const metadata: Metadata = { title: "Openly" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{authConfigured() ? <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">{children}</ClerkProvider> : children}</body></html>;
}
