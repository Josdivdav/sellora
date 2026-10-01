import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout";

export const metadata: Metadata = {
  title: "Checkout | Sellora",
  description:
    "Secure bank-grade checkout on Sellora. Complete your shipping and payment details for fast nationwide delivery in Nigeria.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
