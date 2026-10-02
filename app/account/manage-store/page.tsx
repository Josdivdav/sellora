"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/components/manage-store/manage-store.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useCart } from "@/context/CartContext";
import {
  ManageStoreDashboard,
  HomeHeader,
  Sidebar,
  Toast,
} from "@/components/manage-store";

export type MerchantTab = "dashboard" | "orders" | "analytics" | "products" | "promotions" | "referrals" | "settings";

function ManageStoreInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: isAuthLoading } = useAuth();
  const hasStore = useStoreStatus();
  const { cartCount } = useCart();

  const activeTab = (searchParams.get("tab") as MerchantTab) || "dashboard";

  const [headerSearch, setHeaderSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/");
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSignOut = async () => {
    await SignOut();
    router.replace("/");
  };

  if (!isAuthLoading && !user) {
    return null;
  }

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/cart")}
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
