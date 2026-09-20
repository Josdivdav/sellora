import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders | Sellora",
  description: "Track shipments, manage deliveries, and view invoices for your Sellora orders.",
};

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}