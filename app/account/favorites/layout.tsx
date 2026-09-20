import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorite Stores | Sellora",
  description: "Browse, follow, and discover your favorite verified merchant stores on Sellora.",
};

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
