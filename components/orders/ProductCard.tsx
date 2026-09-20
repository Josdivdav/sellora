import styles from "@/app/account/orders/orders.module.css";
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
      <div className={styles.image}>
        <img src={product.image} alt={product.name} />
      </div>

      <div className={styles.info}>
        <small>{product.category}</small>
        <h2>{product.name}</h2>
        <small>{product.author || ""}</small>

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
          View Order
        </button>
      </div>
    </article>
  );
}
