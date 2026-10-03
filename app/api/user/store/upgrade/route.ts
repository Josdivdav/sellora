import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseAdmin";
import { invalidateStoreCache } from "@/lib/getStore";
import { getStoreFullUrl } from "@/lib/storeUrl";
import type { Store } from "@/types/store";
import { sendStoreUpgradeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/user/store/upgrade
 * Upgrades a merchant's store to Premium to unlock their custom standalone subdomain:
 * e.g. storename.devico.online (instead of devico.online/storename).
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    console.error("Invalid token in /api/user/store/upgrade:", error);
    return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
  }

  try {
    const storeRef = db.collection("stores").doc(uid);
    const storeSnapshot = await storeRef.get();

    if (!storeSnapshot.exists) {
      return NextResponse.json(
        { error: "Storefront not found. Please create your store before upgrading." },
        { status: 404 }
      );
    }

    const currentData = storeSnapshot.data() || {};
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const now = new Date().toISOString();
    const transactionRef = String(body.transactionRef || body.paymentRef || `UPG_${Date.now()}`).trim();

    const updates = {
      isPremium: true,
      isVerified: true,
      plan: "premium",
      premiumActivatedAt: now,
      premiumPaymentRef: transactionRef,
      updatedAt: now,
    };

    await storeRef.set(updates, { merge: true });

    // Update referral status if this store was referred by another merchant
    try {
      const refSnapshot = await db.collection('referrals')
        .where('referredStoreId', '==', uid)
        .limit(1)
        .get();

      if (!refSnapshot.empty) {
        const refDoc = refSnapshot.docs[0];
        await refDoc.ref.update({
          status: 'premium_activated',
          premiumActivatedAt: now,
        });
      }
    } catch (refErr) {
      console.warn('Could not update referral record on upgrade:', refErr);
    }

    // Invalidate in-memory cache for instant global propagation
    if (currentData.slug) {
      invalidateStoreCache(currentData.slug);
    }
    invalidateStoreCache(uid);

    const refreshedSnapshot = await storeRef.get();
    const finalStore = { id: storeSnapshot.id, ...refreshedSnapshot.data() } as Store;

    const fullUrl = getStoreFullUrl(finalStore);

    // Dispatch upgrade confirmation email (non-blocking)
    (async () => {
      try {
        let merchantEmail = finalStore.email;
        if (!merchantEmail) {
          const uSnap = await db.collection("users").doc(uid).get();
          merchantEmail = uSnap.data()?.email;
        }
        if (merchantEmail) {
          await sendStoreUpgradeEmail({
            to: merchantEmail,
            storeName: finalStore.name,
            subdomainUrl: fullUrl,
            transactionRef,
          });
        }
      } catch (e) {
        console.warn("[Sellora Email] Store upgrade email error:", e);
      }
    })();

    return NextResponse.json(
      {
        success: true,
        message: `Congratulations! Your unique subdomain (${finalStore.slug}.devico.online) is now active.`,
        store: finalStore,
        fullUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error upgrading store to premium:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to activate premium subdomain. Please try again." },
      { status: 500 }
    );
  }
}
