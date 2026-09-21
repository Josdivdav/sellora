"use client";

import { useMemo, useState, useEffect } from "react";
import styles from "@/app/home.module.css";
import SideButton from "@/components/SideButton";
import buyerNav from "@/config/BuyerNav";
import type { User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import ordersData from "@/data/orders.json";
import storesData from "@/data/stores.json";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onCreateStore?: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  hasStore?: boolean;
  manageStore?: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  user,
  onCreateStore,
  onSignOut,
  onSignIn,
  hasStore,
  manageStore = () => {},
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [favCount, setFavCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sellora_favorite_stores");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed.length;
        }
      } catch {
        // ignore
      }
    }
    return storesData.filter((s) => s.isFavorite).length;
  });
  
  useEffect(() => {

    const handleStorage = () => {
      try {
        const stored = localStorage.getItem("sellora_favorite_stores");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setFavCount(parsed.length);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("sellora_favorites_updated", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("sellora_favorites_updated", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const activeOrdersCount = useMemo(() => {
    return ordersData.filter(
      (order) => order.status === "PROCESSING" || order.status === "IN_TRANSIT",
    ).length;
  }, []);

  const visibleNav = buyerNav.filter((item) => user || !item.requiresAuth);

  const getBadgeValue = (key?: "activeOrders" | "favoriteStores") => {
    if (key === "activeOrders") return activeOrdersCount > 0 ? String(activeOrdersCount) : undefined;
    if (key === "favoriteStores") return favCount > 0 ? String(favCount) : undefined;
    return undefined;
  };

  const handleManageStore = () => {
    onClose();
    if (manageStore) {
      manageStore();
    } else {
      router.push("/account/manage-store");
    }
  };

  const handleCreateStore = () => {
    onClose();
    if (onCreateStore) {
      onCreateStore();
    } else {
      router.push("/account/create-store");
    }
  };

  return (
    <>
      <button
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        onClick={onClose}
        aria-label="Close menu"
      />

      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        aria-label="Store menu"
      >
        <div className={styles.sidebarTitle}>
          <span>{user ? user.displayName || "My account" : "Navigation"}</span>
          <button onClick={onClose} aria-label="Close menu">
            <span className="material-icons-round">close</span>
          </button>
        </div>

        {
          (user ? (
            !hasStore ? 
            <button className={styles.createStore} onClick={handleCreateStore}>
              <span className="material-icons-round">add</span>
              Create store
            </button> : (
              <button className={styles.createStore} onClick={handleManageStore}>
                Manage store
                <span className="material-icons-round">chevron_right</span>
              </button>
            )
          ) : <div></div>)
        }
        <nav className={styles.sideNav}>
          {visibleNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <SideButton
                key={item.href}
                label={item.label}
                icon={item.icon}
                n={getBadgeValue(item.badgeKey)}
                onClick={() => {
                  onClose();
                  router.push(item.href);
                }}
                active={isActive}
              />
            );
          })}

          {user ? (
            <SideButton label="Log out" icon="logout" onClick={onSignOut} />
          ) : (
            <SideButton label="Log in" icon="login" onClick={onSignIn} />
          )}
        </nav>

        <div className={styles.upgradeCard}>
          <span className="material-icons-round">auto_awesome</span>
          <strong>Sell on Sellora</strong>
          <p>Reach millions of shoppers and open your own verified storefront.</p>
          <button onClick={hasStore ? handleManageStore : handleCreateStore}>
            {hasStore ? "Manage store" : "Start selling"}
          </button>
        </div>
      </aside>
    </>
  );
}
