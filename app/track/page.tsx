import { Suspense } from "react";
import type { Metadata } from "next";
import TrackOrderClient from "@/components/track/TrackOrderClient";

export const metadata: Metadata = {
  title: "Track Your Order Shipment - Sellora",
  description: "Track your nationwide order delivery and package checkpoints in real time on Sellora.",
};

export default function TrackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Loading tracking...</div>}>
      <TrackOrderClient />
    </Suspense>
  );
}
