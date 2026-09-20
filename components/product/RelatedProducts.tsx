"use client";

import Link from "next/link";
import styles from "./product.module.css";
import type { Product } from "@/types/product";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface RelatedProductsProps {
  products: Product[];
  currentProductId: string;
  onAddToCart: (product: Product) => void;
}

export default function RelatedProducts({
  products,
  currentProductId,
  onAddToCart,
}: RelatedProductsProps) {
  const related = products
    .filter((p) => p.id !== currentProductId)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className={styles.relatedSection}>
      <div className={styles.relatedHeading}>
        <h2>
          <span className="material-icons-round" style={{ verticalAlign: "middle", marginRight: "8px", color: "#2b6dff" }}>
            recommend
          </span>
          You Might Also Like
        </h2>
        <Link
          href="/"
          style={{ fontSize: "13px", color: "#2b6dff", textDecoration: "none", fontWeight: 600 }}
        >
          View all products →
        </Link>
      </div>

      <div className={styles.relatedGrid}>
        {related.map((item) => (
          <article
            key={item.id}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #edf0f7",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(11, 18, 48, 0.04)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Link
              href={`/products/${item.id}`}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: "#f8fafc" }}>
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {item.oldPrice && (
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      padding: "3px 8px",
                      borderRadius: "50px",
                      background: "linear-gradient(135deg, #2b6dff, #7b2ff7)",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    Sale
                  </span>
                )}
              </div>

              <div style={{ padding: "12px 14px 10px" }}>
                <small style={{ color: "#2b6dff", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase" }}>
                  {item.category}
                </small>
                <h4
                  style={{
                    margin: "4px 0 6px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#111827",
                    lineHeight: "1.35",
                    height: "36px",
                    overflow: "hidden",
                  }}
                >
                  {item.name}
                </h4>

                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <strong style={{ fontSize: "15px", color: "#0b1230" }}>
                    {currency.format(item.price)}
                  </strong>
                  {item.oldPrice && (
                    <span style={{ fontSize: "11.5px", color: "#9ca3af", textDecoration: "line-through" }}>
                      {currency.format(item.oldPrice)}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            <div style={{ padding: "0 14px 14px", marginTop: "auto" }}>
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "50px",
                  background: "#0b1230",
                  color: "#ffffff",
                  border: 0,
                  font: "inherit",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span className="material-icons-round" style={{ fontSize: "15px" }}>
                  shopping_cart
                </span>
                Add to cart
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
