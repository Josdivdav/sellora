import styles from "@/app/home.module.css";
import type { Product } from "@/types/product";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  category: string;
  products: Product[];
  onAddToCart: (product: Pick<Product, "id" | "name">) => void;
}

export default function ProductGrid({
  category,
  products,
  onAddToCart,
}: ProductGridProps) {
  return (
    <>
      <div className={styles.heading}>
        <h1>{category === "All" ? "All products" : category}</h1>
        <span>
          {products.length} item{products.length === 1 ? "" : "s"}
        </span>
      </div>

      {products.length ? (
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
