"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Returns whether the CURRENT authenticated user owns a store directly from the database.
 * - If not logged in -> always false.
 * - Queries backend /api/user/store to guarantee real-time accuracy across accounts.
 * - Stores state in memory with ZERO localStorage usage.
 */
export function useStoreStatus(): boolean {
  const { user, loading: authLoading } = useAuth();
  const [hasStore, setHasStore] = useState(false);

  const sync = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setHasStore(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      if (!token) return;

      const res = await fetch("/api/user/store", {
        headers: { authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setHasStore(Boolean(json?.data));
      } else if (res.status === 404) {
        setHasStore(false);
      }
    } catch (err) {
      console.warn("Could not verify store status with backend:", err);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void sync();

    const handleUpdate = () => {
      void sync();
    };

    window.addEventListener("sellora_store_status_changed", handleUpdate);
    window.addEventListener("sellora_favorites_updated", handleUpdate);

    return () => {
      window.removeEventListener("sellora_store_status_changed", handleUpdate);
      window.removeEventListener("sellora_favorites_updated", handleUpdate);
    };
  }, [sync]);

  return hasStore;
}
