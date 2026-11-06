import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./components.css";
import "./workflows.css";
import "./scheduling.css";
import "./guide.css";

export const metadata: Metadata = { title: "Openly" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
