import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorite Stores",
  description: "Browse, follow, and discover your favorite verified merchant stores on Sellora.",
  robots: { index: false, follow: false },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
