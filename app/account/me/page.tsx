import type { Metadata } from "next";
import { AccountMeClient } from "@/components/account-me";

export const metadata: Metadata = {
  title: "My Account | Sellora",
  description:
    "Manage your personal profile, default shipping address, communication preferences, and security on Sellora.",
};

export default function AccountMePage() {
  return <AccountMeClient />;
}
