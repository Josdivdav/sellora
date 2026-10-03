"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./track.module.css";
import HomeHeader from "@/components/home/HomeHeader";
import Sidebar from "@/components/SidebarN";
import { useAuth } from "@/context/AuthContext";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useCart } from "@/context/CartContext";
import { SignOut } from "@/functions/home.func";

interface TrackingEvent {
  status: string;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  completed: boolean;
  current?: boolean;
}

interface PublicTrackingData {
  id: string;
  orderNumber: string;
  trackingNumber: string;
  status: "PROCESSING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  carrier: string;
  carrierPhone: string;
  shippingMethod: string;
  createdAt: string;
  estimatedDelivery: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  trackingEvents: TrackingEvent[];
  destination: {
    city: string;
    state: string;
    recipientName: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    image: string;
    storeName: string;
  }>;
  store: {
    name: string;
    isVerified: boolean;
  };
}

export default function TrackOrderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const hasStore = useStoreStatus();
  const { cartCount } = useCart();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [queryCode, setQueryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackingData, setTrackingData] = useState<PublicTrackingData | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTracking = useCallback(async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/track?code=${encodeURIComponent(clean)}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || `No tracking information found for "${clean}".`);
        setTrackingData(null);
      } else {
        setTrackingData(json.tracking);
        setError("");
      }
    } catch {
      setError("Unable to connect to tracking server. Please check your internet connection.");
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Read URL query code on mount
  useEffect(() => {
    const initialCode = searchParams?.get("code") || searchParams?.get("id") || "";
    if (initialCode) {
      setQueryCode(initialCode);
      void fetchTracking(initialCode);
    }
  }, [searchParams, fetchTracking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryCode.trim()) return;
    router.replace(`/track?code=${encodeURIComponent(queryCode.trim())}`);
    void fetchTracking(queryCode);
  };

  const handleCopy = () => {
    if (!trackingData?.trackingNumber) return;
    navigator.clipboard.writeText(trackingData.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("en-NG", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Determine current active step index (0-3)
  const getActiveStep = (status: string) => {
    if (status === "DELIVERED") return 3;
    if (status === "IN_TRANSIT") return 2;
    if (status === "PROCESSING") return 1;
    return 0; // ORDER_PLACED
  };

  const activeStep = trackingData ? getActiveStep(trackingData.status) : 0;
  const isCancelled = trackingData?.status === "CANCELLED";

  return (
    <div className={styles.container}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/cart")}
        onLogoClick={() => router.push("/")}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          hasStore={hasStore}
          onCreateStore={() => router.push("/account/create-store")}
          manageStore={() => router.push("/account/manage-store")}
          onSignOut={async () => {
            await SignOut();
            router.replace("/");
          }}
          onSignIn={() => router.push("/login?redirect=/track")}
        />

        <main className={styles.main}>
        {/* Search Hero */}
        <section className={styles.searchHero}>
          <h1 className={styles.heroTitle}>Track Your Order Live</h1>
          <p className={styles.heroSubtitle}>
            Enter your unique Tracking ID (e.g. <strong>SEL-84920194</strong>) or Order Number (e.g. <strong>ORD-649201</strong>) to view real-time delivery milestones.
          </p>

          <form onSubmit={handleSubmit} className={styles.searchBox}>
            <span className="material-icons-round" style={{ color: "#94a3b8", fontSize: "20px" }}>
              search
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="e.g. SEL-84920194 or ORD-649201"
              value={queryCode}
              onChange={(e) => setQueryCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className={styles.searchBtn} disabled={loading}>
              {loading ? "Searching..." : "Track Package"}
            </button>
          </form>
        </section>

        {/* Loading Spinner */}
        {loading && (
          <div className={styles.loadingSpinner}>
            <span className="material-icons-round" style={{ fontSize: "36px", animation: "spin 1s linear infinite" }}>
              autorenew
            </span>
            <span>Locating shipment details from nationwide logistics hub...</span>
          </div>
        )}

        {/* Error Card */}
        {error && !loading && (
          <div className={styles.errorCard}>
            <span className="material-icons-round" style={{ fontSize: "32px", marginBottom: "8px" }}>
              error_outline
            </span>
            <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {/* Result Card */}
        {trackingData && !loading && (
          <div className={styles.resultCard}>
            {/* Header info */}
            <div className={styles.cardHeader}>
              <div className={styles.carrierInfo}>
                <h3>{trackingData.carrier}</h3>
                <div className={styles.trackingMeta}>
                  <span>Tracking:</span>
                  <span className={styles.trackingNumber}>{trackingData.trackingNumber}</span>
                  <button type="button" className={styles.copyBtn} onClick={handleCopy} title="Copy tracking number">
                    <span className="material-icons-round" style={{ fontSize: "16px" }}>
                      {copied ? "check" : "content_copy"}
                    </span>
                  </button>
                  <span>• Order #{trackingData.orderNumber}</span>
                </div>
              </div>

              <div>
                <span
                  className={`${styles.statusPill} ${
                    isCancelled
                      ? styles.statusCancelled
                      : trackingData.status === "DELIVERED"
                      ? styles.statusDelivered
                      : trackingData.status === "IN_TRANSIT"
                      ? styles.statusInTransit
                      : styles.statusProcessing
                  }`}
                >
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    {isCancelled
                      ? "cancel"
                      : trackingData.status === "DELIVERED"
                      ? "verified"
                      : trackingData.status === "IN_TRANSIT"
                      ? "local_shipping"
                      : "inventory_2"}
                  </span>
                  {trackingData.status === "IN_TRANSIT"
                    ? "In Transit"
                    : trackingData.status === "DELIVERED"
                    ? "Delivered"
                    : trackingData.status === "PROCESSING"
                    ? "Processing"
                    : "Cancelled"}
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            {!isCancelled && (
              <div className={styles.progressSection}>
                <div className={styles.stepper}>
                  {/* Step 1: Order Placed */}
                  <div className={`${styles.step} ${activeStep >= 0 ? styles.stepCompleted : ""}`}>
                    <div className={styles.stepIcon}>
                      <span className="material-icons-round" style={{ fontSize: "18px" }}>
                        receipt_long
                      </span>
                    </div>
                    <span className={styles.stepLabel}>Order Placed</span>
                  </div>

                  {/* Step 2: Processing */}
                  <div
                    className={`${styles.step} ${
                      activeStep > 1 ? styles.stepCompleted : activeStep === 1 ? styles.stepCurrent : ""
                    }`}
                  >
                    <div className={styles.stepIcon}>
                      <span className="material-icons-round" style={{ fontSize: "18px" }}>
                        inventory_2
                      </span>
                    </div>
                    <span className={styles.stepLabel}>Packaging</span>
                  </div>

                  {/* Step 3: In Transit */}
                  <div
                    className={`${styles.step} ${
                      activeStep > 2 ? styles.stepCompleted : activeStep === 2 ? styles.stepCurrent : ""
                    }`}
                  >
                    <div className={styles.stepIcon}>
                      <span className="material-icons-round" style={{ fontSize: "18px" }}>
                        local_shipping
                      </span>
                    </div>
                    <span className={styles.stepLabel}>In Transit</span>
                  </div>

                  {/* Step 4: Delivered */}
                  <div
                    className={`${styles.step} ${
                      activeStep >= 3 ? styles.stepCompleted : ""
                    }`}
                  >
                    <div className={styles.stepIcon}>
                      <span className="material-icons-round" style={{ fontSize: "18px" }}>
                        home
                      </span>
                    </div>
                    <span className={styles.stepLabel}>Delivered</span>
                  </div>
                </div>

                <div className={styles.progressMeta}>
                  <div>
                    <strong>Estimated Arrival:</strong>{" "}
                    {new Date(trackingData.estimatedDelivery).toLocaleDateString("en-NG", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div>
                    <strong>Destination:</strong> {trackingData.destination.city}, {trackingData.destination.state}
                  </div>
                </div>
              </div>
            )}

            {/* Checkpoints Timeline */}
            <div className={styles.timelineSection}>
              <h4 className={styles.sectionHeading}>Shipment Activity</h4>
              <div className={styles.timelineList}>
                {trackingData.trackingEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className={`${styles.timelineItem} ${evt.current ? styles.timelineItemActive : ""}`}
                  >
                    <div className={styles.timelineTitle}>{evt.title}</div>
                    <div className={styles.timelineDesc}>{evt.description}</div>
                    <div className={styles.timelineMeta}>
                      <span>{evt.location}</span>
                      <span>•</span>
                      <span>{formatDate(evt.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Package Contents */}
            <div className={styles.itemsPreview}>
              <h4 className={styles.sectionHeading} style={{ marginBottom: "12px" }}>
                Package Items ({trackingData.items.length})
              </h4>
              <div className={styles.itemsList}>
                {trackingData.items.map((item, idx) => (
                  <div key={idx} className={styles.itemRow}>
                    {item.image && (
                      <img src={item.image} alt={item.name} className={styles.itemImg} />
                    )}
                    <div>
                      <strong style={{ color: "#0f172a", display: "block" }}>{item.name}</strong>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>
                        Qty: {item.quantity} • Sold by {item.storeName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
