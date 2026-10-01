import type { Metadata } from "next";
import { AboutClient } from "@/components/about";

export const metadata: Metadata = {
  title: "About Us & How to Get Started | Sellora Nigeria",
  description:
    "Learn about Sellora, the modern peer-to-peer marketplace built for Nigerian merchants and shoppers. Step-by-step tutorial on how to buy, create a storefront, receive direct bank transfers, and confirm orders via WhatsApp.",
  keywords: [
    "Sellora About",
    "How to Sell on Sellora",
    "Sellora Tutorial",
    "Nigerian ecommerce",
    "Create store Nigeria",
    "Peer-to-peer marketplace Nigeria",
    "Direct bank transfer shopping",
  ],
  openGraph: {
    title: "About Sellora & How to Get Started",
    description:
      "Sellora is built for the next generation of Nigerian merchants and shoppers. Zero gateway fees, instant WhatsApp confirmation, and nationwide delivery.",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
