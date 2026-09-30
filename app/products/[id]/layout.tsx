import type { Metadata } from "next";
import { getProductById } from "@/lib/getProduct";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const product = await getProductById(id);

    if (product) {
      const title = `${product.name} — Buy Online`;
      const description =
        product.description?.slice(0, 160) ||
        `Buy ${product.name} on Sellora. Fast delivery and secure payment.`;
      const image = product.images?.[0] || product.image || "/logo.png";

      return {
        title,
        description,
        openGraph: {
          type: "website",
          title,
          description,
          images: [{ url: image, alt: product.name }],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [image],
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
    title: "Product Details",
    description:
      "View product specifications, merchant ratings, and order online on Sellora.",
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
