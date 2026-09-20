"use client";

import styles from "./product.module.css";
import type { Product } from "@/types/product";

interface ProductSpecsProps {
  product: Product;
}

export default function ProductSpecs({ product }: ProductSpecsProps) {
  const specs = product.specifications || {};
  const specEntries = Object.entries(specs);

  return (
    <div className={styles.sectionCard}>
      <h3 className={styles.sectionTitle}>
        <span className="material-icons-round">tune</span>
        Technical Specifications
      </h3>

      {specEntries.length > 0 ? (
        <div className={styles.specsTable}>
          {specEntries.map(([key, val]) => (
            <div key={key} className={styles.specRow}>
              <span className={styles.specKey}>{key}</span>
              <span className={styles.specValue}>{val}</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "#6b7280", fontSize: "13.5px", margin: 0 }}>
          Standard product specifications apply. Contact merchant for technical documentation.
        </p>
      )}

      {product.tags && product.tags.length > 0 && (
        <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
            Tags:
          </span>
          {product.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "11.5px",
                padding: "3px 10px",
                borderRadius: "50px",
                background: "#f1f5f9",
                color: "#475569",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
