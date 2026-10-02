import { getProductById } from "@/lib/getProduct";
import ProductDetailClient from "@/components/product/ProductDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const initialProduct = await getProductById(id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";
  const canonicalUrl = `${siteUrl}/products/${initialProduct?.slug || id}`;
  const images =
    initialProduct?.images && initialProduct.images.length > 0
      ? initialProduct.images
      : [initialProduct?.image || `${siteUrl}/logo.png`];

  const productJsonLd = initialProduct
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            "@id": `${canonicalUrl}/#product`,
            name: initialProduct.name,
            description:
              initialProduct.description ||
              `Buy ${initialProduct.name} on Sellora with verified merchant fulfillment. Developed by Divine David (https://divinie.web.app).`,
            image: images,
            sku: initialProduct.id,
            offers: {
              "@type": "Offer",
              url: canonicalUrl,
              priceCurrency: "NGN",
              price: initialProduct.price,
              priceValidUntil: "2027-12-31",
              availability:
                initialProduct.inStock !== false
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: {
                "@type": "Organization",
                name: initialProduct.author || "Sellora Verified Merchant",
              },
            },
            brand: {
              "@type": "Brand",
              name: initialProduct.author || "Sellora",
            },
            ...(initialProduct.rating && initialProduct.rating > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: initialProduct.rating,
                    reviewCount: initialProduct.reviewsCount || 1,
                  },
                }
              : {}),
          },
          {
            "@type": "BreadcrumbList",
            "@id": `${canonicalUrl}/#breadcrumb`,
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: siteUrl,
              },
              ...(initialProduct.category
                ? [
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: initialProduct.category,
                      item: `${siteUrl}/?category=${encodeURIComponent(initialProduct.category)}`,
                    },
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: initialProduct.name,
                      item: canonicalUrl,
                    },
                  ]
                : [
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: initialProduct.name,
                      item: canonicalUrl,
                    },
                  ]),
            ],
          },
        ],
      }
    : null;

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <ProductDetailClient id={id} initialProduct={initialProduct} />
    </>
  );
}
