import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders",
  description: "Track shipments, manage deliveries, and view invoices for your Sellora orders.",
  robots: { index: false, follow: false },
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}