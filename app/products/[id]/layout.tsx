import type { Metadata } from "next";
import { getProductById } from "@/lib/getProduct";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";

  try {
    const product = await getProductById(id);

    if (product) {
      const title = `${product.name} — Buy Online in Nigeria`;
      const formattedPrice =
        typeof product.price === "number" ? `₦${product.price.toLocaleString()} ` : "";
      const description =
        product.description?.slice(0, 160) ||
        `Buy ${product.name} ${formattedPrice}on Sellora. Fast nationwide delivery and verified merchant protection. Developed by Divine David (https://divinie.web.app).`;
      const image = product.images?.[0] || product.image || `${siteUrl}/logo.png`;
      const canonicalUrl = `${siteUrl}/products/${product.slug || id}`;

      return {
        title,
        description,
        authors: [
          { name: "Divine David", url: "https://divinie.web.app" },
          { name: product.author || "Sellora Verified Merchant" },
        ],
        alternates: {
          canonical: canonicalUrl,
        },
        openGraph: {
          type: "website",
          siteName: "Sellora",
          locale: "en_NG",
          url: canonicalUrl,
          title: `${title} | Sellora`,
          description,
          images: [{ url: image, alt: product.name, width: 800, height: 800 }],
        },
        twitter: {
          card: "summary_large_image",
          title: `${title} | Sellora`,
          description,
          images: [image],
          creator: "@divinedavid",
        },
        other: {
          "product:price:amount": String(product.price),
          "product:price:currency": "NGN",
          "product:availability": product.inStock ? "in stock" : "out of stock",
        },
      };
    }
  } catch {
    // fall through to default
  }

  return {
    title: "Product Details — Buy Online in Nigeria",
    description:
      "View product specifications, merchant ratings, and order online on Sellora. Developed by Divine David (https://divinie.web.app).",
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
