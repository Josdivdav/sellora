import type { Metadata } from "next";
import BuyerMessagesClient from "@/components/messages/BuyerMessagesClient";

export const metadata: Metadata = {
  title: "Messages | Sellora",
  description: "Chat directly with verified sellers and store merchants on Sellora.",
};

export default function MessagesPage() {
  return <BuyerMessagesClient />;
}
