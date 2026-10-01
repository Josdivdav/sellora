"use client";

import Link from "next/link";
import styles from "@/app/home.module.css";
import type { Product } from "@/types/product";
import ProductCard from "./ProductCard";
import storesData from "@/data/stores.json";
import type { Store } from "@/types/store";
import { getStoreRelativePath } from "@/lib/storeUrl";

import EmptyState from "./EmptyState";

interface StoreGroupSectionProps {
  productsByStore: Record<string, Product[]>;
  onSelectStore: (storeName: string) => void;
  onAddToCart: (product: Pick<Product, "id" | "name">) => void;
  stores?: Store[];
  onResetFilters?: () => void;
}

export default function StoreGroupSection({
  productsByStore,
  onSelectStore,
  onAddToCart,
  stores = [],
  onResetFilters,
}: StoreGroupSectionProps) {
  const storeNames = Object.keys(productsByStore);

  if (storeNames.length === 0) {
    return (
      <EmptyState
        title="No store items found"
        description="No merchant store items match your current search or filters. Try resetting your search."
        onReset={onResetFilters}
        showReset={Boolean(onResetFilters)}
      />
    );
  }

  return (
    <div className={styles.storeGroupSection}>
      {storeNames.map((storeName) => {
        const storeProducts = productsByStore[storeName];
        const store =
          stores.find(
            (s) => s.name.toLowerCase() === storeName.toLowerCase()
          ) ||
          (storesData as Store[]).find(
            (s) => s.name.toLowerCase() === storeName.toLowerCase()
          );

        return (
          <section key={storeName} className={styles.storeGroupBlock}>
            <div className={styles.storeGroupHeader}>
              <div className={styles.storeGroupHeaderLeft}>
                {store?.logo ? (
                  <img
                    src={store.logo}
                    alt={storeName}
                    className={styles.storeGroupAvatar}
                  />
                ) : (
                  <div
                    className={styles.storeGroupAvatar}
                    style={{
                      background: "#eef1ff",
                      color: "#2b6dff",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: "16px",
                    }}
                  >
                    {storeName.charAt(0)}
                  </div>
                )}

                <div>
                  <h3 className={styles.storeGroupTitle}>
                    {storeName}
                    {store?.isVerified && (
                      <span
                        className="material-icons-round"
                        style={{ color: "#2b6dff", fontSize: "16px" }}
                      >
                        verified
                      </span>
                    )}
                  </h3>
                  <div className={styles.storeGroupCategory}>
                    {store?.category || "Merchant"} • {storeProducts.length} product
                    {storeProducts.length === 1 ? "" : "s"}
                    {store?.rating && ` • ★ ${store.rating.toFixed(1)}`}
                  </div>
                </div>
              </div>

              <Link
                href={getStoreRelativePath(store || storeName)}
                className={styles.storeGroupViewBtn}
              >
                <span>Visit Storefront</span>
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className={styles.grid}>
              {storeProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
