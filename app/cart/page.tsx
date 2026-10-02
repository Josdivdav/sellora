import type { Metadata } from "next";
import { CartClient } from "@/components/cart";

export const metadata: Metadata = {
  title: "Shopping Cart — Review Items",
  description:
    "Review your selected items, update order quantities, and proceed to direct bank checkout on Sellora. Developed by Divine David (https://divinie.web.app).",
  alternates: {
    canonical: "/cart",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartPage() {
  return <CartClient />;
}
