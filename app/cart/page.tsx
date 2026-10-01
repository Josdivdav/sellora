import type { Metadata } from "next";
import { CartClient } from "@/components/cart";

export const metadata: Metadata = {
  title: "Shopping Cart | Sellora",
  description:
    "Review your selected items, update quantities, and proceed to checkout securely on Sellora.",
};

export default function CartPage() {
  return <CartClient />;
}
