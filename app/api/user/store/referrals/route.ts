import { getAuth } from '@/lib/auth';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { invalidateStoreCache } from '@/lib/getStore';
import type { ReferralRecord, Store } from '@/types/store';

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid token in GET /api/user/store/referrals:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const storeDoc = await db.collection('stores').doc(uid).get();
    if (!storeDoc.exists) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const store = storeDoc.data() as Store;
    const storeSlug = store.slug || uid;

    // Fetch referrals made by this merchant
    let referralsSnapshot;
    try {
      referralsSnapshot = await db
        .collection('referrals')
        .where('referrerId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();
    } catch {
      // Fallback without orderBy if index is still propagating
      referralsSnapshot = await db
        .collection('referrals')
        .where('referrerId', '==', uid)
        .get();
    }

    const referrals: ReferralRecord[] = [];
    referralsSnapshot.forEach((doc) => {
      referrals.push({ id: doc.id, ...doc.data() } as ReferralRecord);
    });

    // Sort manually if fallback was used
    referrals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalReferrals = referrals.length;
    const premiumReferrals = referrals.filter((r) => r.status === 'premium_activated').length;
    const totalEarnings = referrals.reduce((sum, r) => sum + (r.rewardAmount || 1000), 0);
    const canClaimFreePro = totalReferrals >= 3 && !store.isPremium;

    const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'devico.online').toLowerCase();
    const referralLink = `https://${mainDomain}/account/create-store?ref=${storeSlug}`;

    return NextResponse.json({
      success: true,
      referralLink,
      referralCode: storeSlug,
      totalReferrals,
      premiumReferrals,
      totalEarnings,
      canClaimFreePro,
      referrals,
    });
  } catch (error: any) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Claim Free Pro Subdomain when totalReferrals >= 3
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const storeRef = db.collection('stores').doc(uid);
    const storeDoc = await storeRef.get();
    if (!storeDoc.exists) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const store = storeDoc.data() as Store;
    if (store.isPremium) {
      return NextResponse.json({ error: 'Store already has Pro Subdomain active.' }, { status: 400 });
    }

    // Verify referral count
    const refCountSnap = await db.collection('referrals').where('referrerId', '==', uid).get();
    if (refCountSnap.size < 3) {
      return NextResponse.json(
        {
          error: `You need at least 3 successful store referrals to claim Free Pro Subdomain (Current: ${refCountSnap.size}).`,
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await storeRef.update({
      isPremium: true,
      isVerified: true,
      plan: 'premium',
      premiumActivatedAt: now,
      premiumPaymentRef: `REFERRAL_MILESTONE_${Date.now()}`,
      updatedAt: now,
    });

    if (store.slug) {
      invalidateStoreCache(store.slug);
    }
    invalidateStoreCache(uid);

    const updatedDoc = await storeRef.get();
    return NextResponse.json({
      success: true,
      message: '🎉 Congratulations! You unlocked your Standalone Pro Subdomain for FREE via the Referral Programme!',
      store: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error: any) {
    console.error('Error claiming free pro from referrals:', error);
    return NextResponse.json({ error: 'Failed to claim milestone reward' }, { status: 500 });
  }
}
