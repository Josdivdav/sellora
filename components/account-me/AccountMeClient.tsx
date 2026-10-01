"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./me.module.css";
import { useAuth } from "@/context/AuthContext";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useCart } from "@/context/CartContext";
import HomeHeader from "@/components/home/HomeHeader";
import Sidebar from "@/components/SidebarN";
import Toast from "@/components/home/Toast";
import { SignOut } from "@/functions/home.func";

type ActiveTab = "profile" | "address" | "notifications" | "security";

const NIGERIAN_STATES = [
  "Lagos",
  "Abuja (FCT)",
  "Rivers",
  "Oyo",
  "Ogun",
  "Kano",
  "Kaduna",
  "Delta",
  "Edo",
  "Anambra",
  "Enugu",
  "Akwa Ibom",
  "Abia",
  "Plateau",
  "Ondo",
  "Osun",
  "Kwara",
  "Imo",
  "Cross River",
  "Benue",
  "Bayelsa",
  "Bauchi",
  "Adamawa",
  "Sokoto",
  "Niger",
  "Kogi",
  "Kebbi",
  "Katsina",
  "Jigawa",
  "Gombe",
  "Ekiti",
  "Ebonyi",
  "Borno",
  "Yobe",
  "Taraba",
  "Nasarawa",
  "Zamfara",
];

export default function AccountMeClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const hasStore = useStoreStatus();
  const { cartCount } = useCart();

  // Navigation states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");

  // Profile data states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  // Address states
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Lagos");
  const [postalCode, setPostalCode] = useState("");

  // Notification toggles
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    securityAlerts: true,
  });

  // Stats
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [totalFollowedStores, setTotalFollowedStores] = useState<number>(0);

  // Authentication guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/account/me");
    }
  }, [authLoading, user, router]);

  // Fetch user profile from /api/user/me
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingProfile(true);
      const token = await user.getIdToken();
      const res = await fetch("/api/user/me", {
        headers: { authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const u = data.user;
        if (u) {
          setDisplayName(u.displayName || user.displayName || "");
          setEmail(u.email || user.email || "");
          setPhone(u.phone || "");
          setBio(u.bio || "");
          setPhotoURL(u.photoURL || user.photoURL || "");
          setStreet(u.street || "");
          setCity(u.city || "");
          setState(u.state || "Lagos");
          setPostalCode(u.postalCode || "");
          if (u.notifications) {
            setNotifications({
              orderUpdates: u.notifications.orderUpdates ?? true,
              promotions: u.notifications.promotions ?? false,
              securityAlerts: u.notifications.securityAlerts ?? true,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  // Fetch user order & favorites count
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadStats() {
      try {
        const token = await user?.getIdToken();
        if (!token) return;

        // Fetch orders
        const ordersPromise = fetch("/api/orders", {
          headers: { authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (isMounted && typeof data.total === "number") setTotalOrders(data.total);
          })
          .catch(() => {});

        // Fetch favorites
        const favsPromise = fetch("/api/user/followed-stores", {
          headers: { authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (isMounted && Array.isArray(data.followedIds)) setTotalFollowedStores(data.followedIds.length);
          })
          .catch(() => {});

        await Promise.all([ordersPromise, favsPromise]);
      } catch {
        // ignore
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    void fetchUserProfile();
  }, [fetchUserProfile]);

  // Save updated profile
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName,
          phone,
          bio,
          photoURL,
          street,
          city,
          state,
          postalCode,
          notifications,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast("Account profile updated successfully!");
      } else {
        setToast(data.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Save error:", err);
      setToast("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await SignOut();
    router.replace("/");
  };

  if (authLoading || !user) {
    return (
      <div className={styles.page}>
        <div style={{ textAlign: "center", padding: "100px 20px", color: "#64748b" }}>
          Loading your account profile...
        </div>
      </div>
    );
  }

  const initials = (displayName || user.displayName || user.email || "U")
    .slice(0, 2)
    .toUpperCase();

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

        <main className={styles.main}>
          {/* Profile Hero Card */}
          <div className={styles.profileHeroCard}>
            <div className={styles.heroLeft}>
              <div className={styles.avatarWrapper}>
                {photoURL ? (
                  <Image
                    src={photoURL}
                    alt={displayName || "User avatar"}
                    width={76}
                    height={76}
                    className={styles.avatarImg}
                    unoptimized
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div className={styles.heroInfo}>
                <h1 className={styles.heroName}>
                  {displayName || user.displayName || "Sellora Member"}
                  <span className={`material-icons-round ${styles.verifiedBadge}`} title="Verified Account">
                    verified
                  </span>
                </h1>
                <p className={styles.heroEmail}>
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    mail
                  </span>
                  {email || user.email}
                </p>

                <div className={styles.heroBadges}>
                  <span className={styles.roleTag}>
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>
                      person
                    </span>
                    Buyer Account
                  </span>

                  {hasStore ? (
                    <span className={styles.storeTag}>
                      <span className="material-icons-round" style={{ fontSize: "14px" }}>
                        storefront
                      </span>
                      Merchant Store Active
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "11.5px",
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: "14px" }}>
                        info
                      </span>
                      No Store Created
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.heroActions}>
              {hasStore ? (
                <Link href="/account/manage-store" className={styles.storeActionBtn}>
                  <span className="material-icons-round">dashboard</span>
                  Manage Store
                </Link>
              ) : (
                <Link href="/account/create-store" className={styles.storeActionBtn}>
                  <span className="material-icons-round">add_business</span>
                  Open Seller Store
                </Link>
              )}

              <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
                <span className="material-icons-round">logout</span>
                Sign Out
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className={styles.statsGrid}>
            <Link href="/account/orders" className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: "rgba(43, 109, 255, 0.1)", color: "#2b6dff" }}
              >
                <span className="material-icons-round">receipt_long</span>
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{totalOrders}</span>
                <span className={styles.statLabel}>Total Orders</span>
              </div>
            </Link>

            <Link href="/account/favorites" className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
              >
                <span className="material-icons-round">favorite</span>
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{totalFollowedStores}</span>
                <span className={styles.statLabel}>Followed Stores</span>
              </div>
            </Link>

            <Link href="/cart" className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}
              >
                <span className="material-icons-round">shopping_cart</span>
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{cartCount}</span>
                <span className={styles.statLabel}>Cart Items</span>
              </div>
            </Link>

            <div className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: "rgba(168, 85, 247, 0.1)", color: "#a855f7" }}
              >
                <span className="material-icons-round">verified_user</span>
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>Standard</span>
                <span className={styles.statLabel}>Member Status</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabsBar}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <span className="material-icons-round">person_outline</span>
              Profile Details
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "address" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("address")}
            >
              <span className="material-icons-round">location_on</span>
              Shipping Address
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${
                activeTab === "notifications" ? styles.tabBtnActive : ""
              }`}
              onClick={() => setActiveTab("notifications")}
            >
              <span className="material-icons-round">notifications_none</span>
              Preferences
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "security" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <span className="material-icons-round">shield</span>
              Account &amp; Security
            </button>
          </div>

          {/* Tab 1: Profile Details */}
          {activeTab === "profile" && (
            <div className={styles.tabContentCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Personal Details</h2>
                <p className={styles.sectionDesc}>
                  Update your contact information and public identity on Sellora.
                </p>
              </div>

              <form onSubmit={handleSave}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Chukwuma Obi"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Email Address
                      <span className={styles.helperText}>Verified</span>
                    </label>
                    <input
                      type="email"
                      className={styles.input}
                      value={email}
                      disabled
                      title="Email is verified with your authentication provider"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      className={styles.input}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 801 234 5678"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Avatar Image URL</label>
                    <input
                      type="url"
                      className={styles.input}
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Bio / Personal Note</label>
                    <textarea
                      rows={3}
                      className={styles.textarea}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief note about yourself or shopping interests..."
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                    <span className="material-icons-round">
                      {isSaving ? "hourglass_top" : "check"}
                    </span>
                    {isSaving ? "Saving Changes..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Shipping Address */}
          {activeTab === "address" && (
            <div className={styles.tabContentCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Default Shipping Address</h2>
                <p className={styles.sectionDesc}>
                  This address will be automatically pre-selected when you proceed through checkout.
                </p>
              </div>

              <form onSubmit={handleSave}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Street Address</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="House number, street name, apartment or building"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>City / District</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Ikeja, Lekki, Victoria Island"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>State</label>
                    <select
                      className={styles.select}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    >
                      {NIGERIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Country</label>
                    <input type="text" className={styles.input} value="Nigeria" disabled />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Postal Code</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 101241"
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                    <span className="material-icons-round">
                      {isSaving ? "hourglass_top" : "check"}
                    </span>
                    {isSaving ? "Saving Address..." : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 3: Preferences & Notifications */}
          {activeTab === "notifications" && (
            <div className={styles.tabContentCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Communication Preferences</h2>
                <p className={styles.sectionDesc}>
                  Control how and when Sellora sends updates regarding your purchases and account.
                </p>
              </div>

              <div className={styles.toggleList}>
                <div className={styles.toggleItem}>
                  <div className={styles.toggleText}>
                    <div className={styles.toggleTitle}>Order Status Updates</div>
                    <div className={styles.toggleDesc}>
                      Receive real-time notifications when your order is packed, dispatched, and delivered.
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={notifications.orderUpdates}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          orderUpdates: e.target.checked,
                        }))
                      }
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                <div className={styles.toggleItem}>
                  <div className={styles.toggleText}>
                    <div className={styles.toggleTitle}>Promotions &amp; Flash Sales</div>
                    <div className={styles.toggleDesc}>
                      Get exclusive discount codes and weekly promotions from your favorite stores.
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={notifications.promotions}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          promotions: e.target.checked,
                        }))
                      }
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                <div className={styles.toggleItem}>
                  <div className={styles.toggleText}>
                    <div className={styles.toggleTitle}>Account Security Alerts</div>
                    <div className={styles.toggleDesc}>
                      Alerts for new sign-in sessions and password or profile modifications.
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={notifications.securityAlerts}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          securityAlerts: e.target.checked,
                        }))
                      }
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={() => handleSave()}
                  disabled={isSaving}
                >
                  <span className="material-icons-round">
                    {isSaving ? "hourglass_top" : "check"}
                  </span>
                  {isSaving ? "Saving Preferences..." : "Save Preferences"}
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Account & Security */}
          {activeTab === "security" && (
            <div className={styles.tabContentCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Account &amp; Security</h2>
                <p className={styles.sectionDesc}>
                  Review your authentication credentials, session information, and account details.
                </p>
              </div>

              <div className={styles.securityRow}>
                <div>
                  <div className={styles.securityLabel}>User ID (UID)</div>
                  <div className={styles.securityDesc}>
                    Your unique system identifier across Sellora services.
                  </div>
                </div>
                <div className={styles.securityVal}>{user.uid}</div>
              </div>

              <div className={styles.securityRow}>
                <div>
                  <div className={styles.securityLabel}>Authentication Provider</div>
                  <div className={styles.securityDesc}>
                    Identity provider linked to your active account.
                  </div>
                </div>
                <div className={styles.securityVal}>
                  {user.providerData?.[0]?.providerId || "password"}
                </div>
              </div>

              <div className={styles.securityRow}>
                <div>
                  <div className={styles.securityLabel}>Email Verification Status</div>
                  <div className={styles.securityDesc}>
                    Whether your primary email has been verified.
                  </div>
                </div>
                <div style={{ color: "#10b981", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className="material-icons-round" style={{ fontSize: "18px" }}>
                    check_circle
                  </span>
                  Verified
                </div>
              </div>

              <div className={styles.securityRow}>
                <div>
                  <div className={styles.securityLabel}>Sign Out of Current Device</div>
                  <div className={styles.securityDesc}>
                    Clears your session from this browser securely.
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.signOutBtn}
                  onClick={handleSignOut}
                  style={{ alignSelf: "center" }}
                >
                  <span className="material-icons-round">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}
