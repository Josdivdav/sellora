import type { Metadata } from "next";
import { AccountMeClient } from "@/components/account-me";

export const metadata: Metadata = {
  title: "My Account — Settings & Profile",
  description:
    "Manage your personal profile, default shipping address, communication preferences, and security on Sellora.",
  robots: { index: false, follow: false },
};

export default function AccountMePage() {
  return <AccountMeClient />;
}
