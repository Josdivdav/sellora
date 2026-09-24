"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/components/manage-store/manage-store.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import {
  ManageStoreDashboard,
  HomeHeader,
  Sidebar,
  Toast,
} from "@/components/manage-store";

export type MerchantTab = "dashboard" | "orders" | "analytics" | "products" | "promotions" | "settings";

function ManageStoreInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: isAuthLoading } = useAuth();
  const hasStore = useStoreStatus();

  const activeTab = (searchParams.get("tab") as MerchantTab) || "dashboard";

  const [headerSearch, setHeaderSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Cart count from localStorage
  const [cartCount, setCartCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
      return Object.values(cartObj).reduce(
        (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
        0
      );
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
        const count = Object.values(cartObj).reduce(
          (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
          0
        );
        setCartCount(count);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSignOut = async () => {
    const success = await SignOut();
    if (success) router.refresh();
  };

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => { setToast("Opening cart"); router.push("/"); }}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onSignOut={handleSignOut}
          onSignIn={() => router.push("/login")}
          hasStore={hasStore}
        />

        <ManageStoreDashboard
          user={user}
          isAuthLoading={isAuthLoading}
          activeTab={activeTab}
          onShowToast={(msg) => setToast(msg)}
        />
      </div>

      <Toast message={toast} />
    </div>
  );
}

export default function ManageStorePage() {
  return (
    <Suspense>
      <ManageStoreInner />
    </Suspense>
  );
}
