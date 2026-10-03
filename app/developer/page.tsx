import type { Metadata } from "next";
import DeveloperConsoleClient from "@/components/developer/DeveloperConsoleClient";

export const metadata: Metadata = {
  title: "Developer Operations Console | Sellora",
  description: "Platform-wide developer inspection, user metrics, store directory and live activity monitor for Sellora.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DeveloperPage() {
  return <DeveloperConsoleClient />;
}
