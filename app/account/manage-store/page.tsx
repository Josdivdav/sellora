"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/manage-store/manage-store.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import {
  ManageStoreDashboard,
  HomeHeader,
  Sidebar,
  Toast,
} from "@/components/manage-store";

export default function ManageStorePage() {
  const router = useRouter();
  const { user } = useAuth();

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

  // Toast timer
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSignOut = async () => {
    const success = await SignOut();
    if (success) {
      router.refresh();
    }
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => {
          setToast("Opening cart");
          router.push("/");
        }}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onCreateStore={() => {
            setSidebarOpen(false);
            router.push("/create-store");
          }}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          hasStore={true}
          manageStore={() => {
            setSidebarOpen(false);
          }}
        />

        <ManageStoreDashboard
          user={user}
          onShowToast={(msg) => setToast(msg)}
        />
      </div>

      <Toast message={toast} />
    </div>
  );
}
