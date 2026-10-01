"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/create-store/create-store.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useCart } from "@/context/CartContext";
import {
  CreateStoreSetup,
  HomeHeader,
  Sidebar,
  Toast,
} from "@/components/create-store";

export default function CreateStorePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const hasStore = useStoreStatus();
  const { cartCount } = useCart();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const [headerSearch, setHeaderSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Toast timer
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSignOut = async () => {
    await SignOut();
    router.replace("/");
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  if (!authLoading && !user) {
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
          onSignIn={handleSignIn}
          hasStore={hasStore}
        />

        <CreateStoreSetup
          user={user}
          onShowToast={(msg) => setToast(msg)}
          onStoreCreated={() => {
            // useStoreStatus and navigation will reflect the newly created store
            router.push("/account/manage-store");
          }}
        />
      </div>

      <Toast message={toast} />
    </div>
  );
}
