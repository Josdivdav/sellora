import styles from "@/app/home.module.css";
import type { Product } from "@/types/product";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  category: string;
  products: Product[];
  isLoading?: boolean;
  onAddToCart: (product: Pick<Product, "id" | "name">) => void;
}

export default function ProductGrid({
  category,
  products,
  isLoading = false,
  onAddToCart,
}: ProductGridProps) {
  return (
    <>
      <div className={styles.heading}>
        <h1>{category === "All" ? "All products" : category}</h1>
        <span>
          {isLoading
            ? "Loading products..."
            : `${products.length} item${products.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {isLoading ? (
        <section className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonInfo}>
                <div
                  className={styles.skeletonLine}
                  style={{ width: "40%", height: "10px" }}
                />
                <div
                  className={styles.skeletonLine}
                  style={{ width: "85%", height: "16px" }}
                />
                <div
                  className={styles.skeletonLine}
                  style={{ width: "50%", height: "14px" }}
                />
                <div
                  className={styles.skeletonLine}
                  style={{ width: "65%", height: "18px", marginTop: "4px" }}
                />
              </div>
            </div>
          ))}
        </section>
      ) : products.length ? (
        <section className={styles.grid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </section>
      ) : (
        <p className={styles.empty}>No products match your search.</p>
      )}
    </>
  );
}
