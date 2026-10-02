import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout";

export const metadata: Metadata = {
  title: "Secure Checkout — Order & Direct Payment",
  description:
    "Complete your order with verified direct bank transfer and WhatsApp receipt verification on Sellora. Developed by Divine David (https://divinie.web.app).",
  alternates: {
    canonical: "/checkout",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
