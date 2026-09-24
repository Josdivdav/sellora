"use client";

import { useState, useEffect } from "react";

/**
 * Returns whether the current user has a store.
 * Always starts false (matches server render), then syncs from
 * localStorage in useEffect to avoid hydration mismatches.
 */
export function useStoreStatus(): boolean {
  const [hasStore, setHasStore] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        const cached = localStorage.getItem("sellora_my_store");
        if (cached) {
          const parsed = JSON.parse(cached);
          setHasStore(Boolean(parsed?.id || parsed?.name));
        } else {
          setHasStore(false);
        }
      } catch {
        // ignore
      }
    };

    // Run immediately after mount
    sync();

    // Keep in sync when store is created/deleted in any tab
    window.addEventListener("storage", sync);
    window.addEventListener("sellora_favorites_updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("sellora_favorites_updated", sync);
    };
  }, []);

  return hasStore;
}
