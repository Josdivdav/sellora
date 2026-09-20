import Link from "next/link";
import styles from "@/app/home.module.css";
import type { Product } from "@/types/product";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Pick<Product, "id" | "name">) => void;
}

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const roundedRating = Math.round(product.rating);

  return (
    <article className={styles.card}>
      <Link
        href={`/products/${product.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
        title={`View details for ${product.name}`}
      >
        <div className={styles.image}>
          <img src={product.image} alt={product.name} />
          {product.oldPrice && <b>Sale</b>}
        </div>
      </Link>

      <div className={styles.info}>
        <small>{product.category}</small>
        <Link
          href={`/products/${product.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
          title={`View details for ${product.name}`}
        >
          <h2>{product.name}</h2>
        </Link>
        <small style={{ color: "#6b7280", textTransform: "none", fontSize: "12px", fontWeight: 500 }}>
          {product.author || ""}
        </small>

        <p className={styles.rating}>
          <i>
            {"★".repeat(roundedRating)}
            {"☆".repeat(5 - roundedRating)}
          </i>
          {product.rating.toFixed(1)}
        </p>

        <p>
          <strong>{currency.format(product.price)}</strong>
          {product.oldPrice && (
            <del>{currency.format(product.oldPrice)}</del>
          )}
        </p>

        <button onClick={() => onAddToCart(product)}>
          <span className="material-icons-round">shopping_cart</span>
          Add to cart
        </button>
      </div>
    </article>
  );
}
