import { getProductById } from "@/lib/getProduct";
import ProductDetailClient from "@/components/product/ProductDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const initialProduct = await getProductById(id);

  return <ProductDetailClient id={id} initialProduct={initialProduct} />;
}
