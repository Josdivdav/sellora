"use client";

import { useState, useEffect } from "react";
import type { Store, ReferralRecord } from "@/types/store";
import type { User } from "firebase/auth";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  user: User | null;
  onShowToast: (msg: string) => void;
  onStoreUpdated: (updatedStore: Store) => void;
}

const ADMIN_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2348038737198";

export default function MerchantReferralsTab({
  store,
  user,
  onShowToast,
  onStoreUpdated,
}: Props) {
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [premiumReferrals, setPremiumReferrals] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [canClaimFreePro, setCanClaimFreePro] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isClaimingPro, setIsClaimingPro] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchReferrals() {
      try {
        const token = await user?.getIdToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch("/api/user/store/referrals", {
          headers: { authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setReferrals(data.referrals || []);
            setTotalReferrals(data.totalReferrals || 0);
            setPremiumReferrals(data.premiumReferrals || 0);
            setTotalEarnings(data.totalEarnings || 0);
            setCanClaimFreePro(Boolean(data.canClaimFreePro));
            setReferralLink(data.referralLink || "");
          }
        }
      } catch (err) {
        console.error("Error loading referrals:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchReferrals();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Fallback referral link if not yet fetched
  const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "devico.online").toLowerCase();
  const displayLink = referralLink || `https://${mainDomain}/account/create-store?ref=${store.slug}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(displayLink);
      setCopied(true);
      onShowToast("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hey! I created my online store on Sellora. You can launch your own verified store too in under 2 minutes with zero setup fees!\n\nSign up using my link: ${displayLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleWhatsAppPayoutClaim = () => {
    const cleanNumber = ADMIN_WHATSAPP.replace(/\D/g, "");
    const bank = store.bankDetails;
    const msg = encodeURIComponent(
      `Hello Divine, I want to claim my Sellora Referral earnings of ₦${totalEarnings.toLocaleString()}.\n\nStore Name: ${store.name} (${store.slug})\nTotal Stores Referred: ${totalReferrals}\n\nBank Details:\nBank: ${bank?.bankName || "OPay"}\nAccount Number: ${bank?.accountNumber || "Not set"}\nAccount Name: ${bank?.accountName || store.name}`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${msg}`, "_blank");
  };

  const handleClaimFreePro = async () => {
    if (!user || isClaimingPro) return;
    setIsClaimingPro(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/store/referrals", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(data.message || "Pro Subdomain successfully unlocked!");
        setCanClaimFreePro(false);
        if (data.store) {
          onStoreUpdated(data.store);
        }
      } else {
        onShowToast(data.error || "Failed to claim milestone. Please try again.");
      }
    } catch {
      onShowToast("An error occurred while claiming your milestone.");
    } finally {
      setIsClaimingPro(false);
    }
  };

  const milestoneProgress = Math.min(totalReferrals, 3);
  const milestonePercentage = Math.round((milestoneProgress / 3) * 100);

  return (
    <div className={styles.tabPage}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Refer &amp; Earn Programme</h2>
        <p className={styles.tabSubtitle}>
          Invite business owners to create their store on Sellora. Earn ₦1,000 cash per store, or refer 3 to unlock your Standalone Subdomain 100% Free!
        </p>
      </div>

      {/* Hero Card with Referral Link */}
      <div className={styles.referralHeroCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(167, 139, 250, 0.2)",
              border: "1px solid rgba(167, 139, 250, 0.4)",
              color: "#c4b5fd",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}>
              <span className="material-icons-round" style={{ fontSize: "14px" }}>campaign</span>
              SELLORA AMBASSADOR PERK
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "4px 0", color: "#ffffff" }}>
              Your Unique Merchant Referral Link
            </h3>
            <p style={{ fontSize: "13px", color: "#cbd5e1", margin: 0, maxWidth: "600px" }}>
              Share this link with fellow vendors, artisans, and business owners. When they register their storefront, you get credited automatically.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34d399",
              padding: "6px 14px",
              borderRadius: "12px",
              fontSize: "12.5px",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}>
              <span className="material-icons-round" style={{ fontSize: "16px" }}>payments</span>
              ₦1,000 per Active Store
            </span>
          </div>
        </div>

        {/* Link Share Box */}
        <div className={styles.referralLinkBox}>
          <span className="material-icons-round" style={{ fontSize: "20px", color: "#a78bfa" }}>
            link
          </span>
          <span className={styles.referralLinkText}>{displayLink}</span>
          <button type="button" className={styles.referralCopyBtn} onClick={handleCopyLink}>
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              {copied ? "check" : "content_copy"}
            </span>
            {copied ? "Copied Link!" : "Copy Link"}
          </button>
          <button type="button" className={styles.referralWhatsAppBtn} onClick={handleWhatsAppShare}>
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              share
            </span>
            Share on WhatsApp
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <div className={styles.statPillIcon} style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <span className="material-icons-round">groups</span>
          </div>
          <div>
            <div className={styles.statPillValue}>{totalReferrals}</div>
            <div className={styles.statPillLabel}>Stores Referred</div>
          </div>
        </div>

        <div className={styles.statPill}>
          <div className={styles.statPillIcon} style={{ background: "#ecfdf5", color: "#059669" }}>
            <span className="material-icons-round">workspace_premium</span>
          </div>
          <div>
            <div className={styles.statPillValue}>{premiumReferrals}</div>
            <div className={styles.statPillLabel}>Pro Upgrades</div>
          </div>
        </div>

        <div className={styles.statPill}>
          <div className={styles.statPillIcon} style={{ background: "#fef3c7", color: "#d97706" }}>
            <span className="material-icons-round">account_balance_wallet</span>
          </div>
          <div>
            <div className={styles.statPillValue}>₦{totalEarnings.toLocaleString()}</div>
            <div className={styles.statPillLabel}>Total Earned</div>
          </div>
        </div>

        <div className={styles.statPill}>
          <div className={styles.statPillIcon} style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            <span className="material-icons-round">redeem</span>
          </div>
          <div>
            <div className={styles.statPillValue}>{milestoneProgress}/3</div>
            <div className={styles.statPillLabel}>Milestone Progress</div>
          </div>
        </div>
      </div>

      {/* Milestone Card: Refer 3 → Free Pro Subdomain */}
      <div className={styles.milestoneCard}>
        <div className={styles.milestoneHeader}>
          <h3 className={styles.milestoneTitle}>
            <span className="material-icons-round" style={{ color: "#f59e0b" }}>stars</span>
            Referral Milestone: Refer 3 Stores → Get Standalone Subdomain FREE
          </h3>
          <span className={styles.milestoneBadge}>
            Worth ₦5,000 Activation
          </span>
        </div>

        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 12px" }}>
          Instead of paying ₦5,000, refer just 3 other merchants to launch their store on Sellora, and you will unlock your dedicated web address (<strong>{store.slug}.devico.online</strong>) with zero charges.
        </p>

        <div className={styles.milestoneProgressTrack}>
          <div className={styles.milestoneProgressFill} style={{ width: `${milestonePercentage}%` }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b", flexWrap: "wrap", gap: "6px" }}>
          <span>{milestoneProgress} of 3 stores referred ({milestonePercentage}%)</span>
          {Boolean(store.isPremium || store.plan === "premium") ? (
            <span style={{ color: "#059669", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <span className="material-icons-round" style={{ fontSize: "16px" }}>verified</span>
              Pro Subdomain Active on Your Store
            </span>
          ) : milestoneProgress >= 3 ? (
            <span style={{ color: "#10b981", fontWeight: 700 }}>
              🎉 Milestone Complete! Ready to activate.
            </span>
          ) : (
            <span>{3 - milestoneProgress} more referral(s) needed</span>
          )}
        </div>

        {canClaimFreePro && (
          <button
            type="button"
            className={styles.milestoneClaimBtn}
            onClick={handleClaimFreePro}
            disabled={isClaimingPro}
          >
            <span className="material-icons-round">workspace_premium</span>
            {isClaimingPro ? "Unlocking Free Subdomain..." : "Claim Free Pro Subdomain (Milestone Reward)"}
          </button>
        )}
      </div>

      {/* Cash Payout Card */}
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
          <div>
            <h3 className={styles.cardTitle} style={{ margin: "0 0 4px" }}>Direct Bank Payouts</h3>
            <p className={styles.tabSubtitle}>Referral earnings are sent directly to your bank account via OPay or bank transfer.</p>
          </div>
          <button
            type="button"
            onClick={handleWhatsAppPayoutClaim}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#25d366",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "8px 16px",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>chat</span>
            Request Payout via WhatsApp
          </button>
        </div>

        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "14px 18px",
          fontSize: "13px",
          color: "#334155",
          lineHeight: 1.6,
        }}>
          <strong>Registered Settlement Account:</strong>{" "}
          {store.bankDetails?.bankName ? (
            <span>
              {store.bankDetails.bankName} • <strong>{store.bankDetails.accountNumber}</strong> ({store.bankDetails.accountName})
            </span>
          ) : (
            <span style={{ color: "#d97706" }}>
              No bank account set yet. Please add your bank details in the <strong>Settings</strong> tab to receive payouts.
            </span>
          )}
        </div>
      </div>

      {/* Referred Stores History Table */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle} style={{ marginBottom: "14px" }}>
          Referred Stores History ({referrals.length})
        </h3>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>
            Loading referral records...
          </div>
        ) : referrals.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#eef2ff",
              color: "#4f46e5",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 12px",
              fontSize: "28px"
            }}>
              <span className="material-icons-round">share</span>
            </div>
            <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
              No stores referred yet
            </h4>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 auto 16px", maxWidth: "420px" }}>
              Share your link with store owners and vendors. As soon as they create their storefront, they will show up here and you&apos;ll earn ₦1,000!
            </p>
            <button
              type="button"
              className={styles.referralCopyBtn}
              onClick={handleCopyLink}
              style={{ background: "#4f46e5", color: "#ffffff" }}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>content_copy</span>
              Copy Your Referral Link
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "12px" }}>
                  <th style={{ padding: "10px 12px" }}>Store Name</th>
                  <th style={{ padding: "10px 12px" }}>Handle</th>
                  <th style={{ padding: "10px 12px" }}>Date Joined</th>
                  <th style={{ padding: "10px 12px" }}>Plan Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Reward</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => (
                  <tr key={ref.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontWeight: 700, color: "#0f172a" }}>
                      {ref.referredStoreName}
                    </td>
                    <td style={{ padding: "12px", color: "#4f46e5" }}>
                      @{ref.referredStoreSlug}
                    </td>
                    <td style={{ padding: "12px", color: "#64748b" }}>
                      {new Date(ref.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {ref.status === "premium_activated" ? (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "#ecfdf5",
                          color: "#059669",
                          borderRadius: "20px",
                          padding: "3px 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}>
                          <span className="material-icons-round" style={{ fontSize: "13px" }}>stars</span>
                          PRO Subdomain
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: "#f1f5f9",
                          color: "#475569",
                          borderRadius: "20px",
                          padding: "3px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}>
                          Standard Store
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, color: "#10b981" }}>
                      +₦{(ref.rewardAmount || 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
