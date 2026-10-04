"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./page-transition.module.css";

/**
 * Global Page Transition Loader
 * Shows an instant progress bar and branded overlay whenever the user navigates
 * between pages (clicks any internal link, uses browser back/forward, or programmatically switches pages)
 * before the target page is fully sent and rendered by Next.js.
 */
export default function PageTransitionLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  const prevRouteRef = useRef<string>("");
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentRoute = `${pathname}${searchParams ? `?${searchParams.toString()}` : ""}`;

  // Start the loading animation
  const startLoading = useCallback(() => {
    setIsLoading(true);
    setProgress(15);

    // Show center overlay if navigation takes longer than 80ms (avoids flicker for instant cached transitions)
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlay(true);
    }, 80);

    // Animate progress smoothly towards ~85%
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          return 85;
        }
        // Increment with diminishing speed
        const step = Math.max(1, Math.floor((90 - prev) / 6));
        return Math.min(prev + step, 85);
      });
    }, 120);

    // Safety timeout: Auto-dismiss after 8 seconds in case navigation is cancelled or failed
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      stopLoading();
    }, 8000);
  }, []);

  // Complete and hide the loading animation
  const stopLoading = useCallback(() => {
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    // Snap progress to 100%
    setProgress(100);
    setShowOverlay(false);

    // Fade out and reset after completion
    const resetTimer = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 220);

    return () => clearTimeout(resetTimer);
  }, []);

  // Route change detector: When Next.js delivers and mounts the new page, stop loading
  useEffect(() => {
    if (prevRouteRef.current && prevRouteRef.current !== currentRoute) {
      stopLoading();
    }
    prevRouteRef.current = currentRoute;
  }, [currentRoute, stopLoading]);

  // Global click & navigation listeners
  useEffect(() => {
    // 1. Intercept internal link clicks
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore if event was prevented or non-primary button
      if (e.defaultPrevented || e.button !== 0) return;
      // Ignore modifier keys (opens in new tab/window)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external, anchor hash, tel, mailto, javascript, or target="_blank"
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      try {
        const dest = new URL(anchor.href, window.location.href);
        const curr = new URL(window.location.href);

        // Different origin -> ignore
        if (dest.origin !== curr.origin) return;

        // Same pathname and query -> no route transition
        if (dest.pathname === curr.pathname && dest.search === curr.search) {
          return;
        }

        // Internal navigation to a different page: trigger loader immediately!
        startLoading();
      } catch {
        // ignore malformed URLs
      }
    };

    // 2. Intercept browser back/forward buttons
    const handlePopState = () => {
      startLoading();
    };

    // 3. Intercept hard page refreshes or unloads
    const handleBeforeUnload = () => {
      startLoading();
    };

    // 4. Custom event for manual programmatic navigation
    const handleCustomRouteStart = () => {
      startLoading();
    };

    // 5. Dismiss on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopLoading();
      }
    };

    // 6. Monkey-patch Next.js router instance if exposed on window
    const patchNextRouter = () => {
      const nextObj = (window as any).next;
      if (nextObj?.router && !nextObj.router.__patchedForLoader) {
        const originalPush = nextObj.router.push;
        const originalReplace = nextObj.router.replace;

        nextObj.router.push = function (href: string, options: any) {
          try {
            const dest = new URL(href, window.location.href);
            if (dest.pathname !== window.location.pathname || dest.search !== window.location.search) {
              startLoading();
            }
          } catch {
            startLoading();
          }
          return originalPush.apply(this, [href, options]);
        };

        nextObj.router.replace = function (href: string, options: any) {
          try {
            const dest = new URL(href, window.location.href);
            if (dest.pathname !== window.location.pathname || dest.search !== window.location.search) {
              startLoading();
            }
          } catch {
            startLoading();
          }
          return originalReplace.apply(this, [href, options]);
        };

        nextObj.router.__patchedForLoader = true;
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("sellora:page-loading", handleCustomRouteStart);
    window.addEventListener("keydown", handleKeyDown);

    // Initial check and periodic check to patch window.next.router once initialized
    patchNextRouter();
    const routerInterval = setInterval(patchNextRouter, 500);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("sellora:page-loading", handleCustomRouteStart);
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(routerInterval);
    };
  }, [startLoading, stopLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <>
      {/* Top Gradient Progress Bar */}
      <div
        className={styles.progressBar}
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
        aria-hidden="true"
      />

      {/* Branded Center Backdrop Overlay */}
      <div
        className={`${styles.overlay} ${showOverlay ? styles.overlayVisible : ""}`}
        aria-live="polite"
        aria-busy={isLoading}
      >
        <div className={styles.loaderCard}>
          <div className={styles.brandIconWrapper}>
            <img
              src="/favico.png"
              width="36"
              height="36"
              alt="Sellora"
              className={styles.pulseLogo}
            />
            <div className={styles.spinnerRing} />
          </div>
          <div className={styles.loadingInfo}>
            <span className={styles.loadingTitle}>Sellora</span>
            <span className={styles.loadingSubtitle}>
              Loading page<span className={styles.dots}>...</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
