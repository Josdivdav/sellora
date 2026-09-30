import { Suspense } from "react";
import { getAllProducts } from "@/lib/getProduct";
import HomeClient from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { products, categories, stores } = await getAllProducts();

  return (
    <Suspense fallback={null}>
      <HomeClient
        initialProducts={products}
        initialCategories={categories}
        initialStores={stores}
      />
    </Suspense>
  );
}
