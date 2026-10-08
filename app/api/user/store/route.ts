import { getAuth } from 'firebase-admin/auth';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { invalidateStoreCache } from '@/lib/getStore';
import { sendStoreCreatedEmail } from '@/lib/email';
import { getStoreFullUrl } from '@/lib/storeUrl';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid token in /api/user/store:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const storeRef = db.collection('stores').doc(uid);

    const storeSnapshot = await storeRef.get();
    const isNewStore = !storeSnapshot.exists;

    const updated = await request.json();

    if (!updated) {
      return NextResponse.json({ error: 'Store details are missing' }, { status: 400 });
    }

    const storeData = {
      ...updated,
      id: updated.id || uid,
      updatedAt: new Date().toISOString(),
    };

    await Promise.all([
      storeRef.set(storeData, { merge: true }),
      userRef.set({ has_store: true, updatedAt: new Date().toISOString() }, { merge: true }),
    ]);

    // Send store created email if newly created (non-blocking)
    if (isNewStore) {
      (async () => {
        try {
          const userSnap = await userRef.get();
          const merchantEmail = userSnap.data()?.email || updated.email;
          if (merchantEmail && updated.name) {
            const storeUrl = getStoreFullUrl(storeData as any);
            await sendStoreCreatedEmail({
              to: merchantEmail,
              storeName: updated.name,
              storeSlug: updated.slug || uid,
              storeUrl,
            });
          }
        } catch (e) {
          console.warn('[Sellora Email] Store creation email error:', e);
        }
      })();
    }

    // Record referral if store was created via a referral link
    if (updated.referredBy && typeof updated.referredBy === 'string') {
      try {
        const refSlug = updated.referredBy.toLowerCase().trim();
        const refQuery = await db.collection('stores').where('slug', '==', refSlug).limit(1).get();
        if (!refQuery.empty) {
          const referrerDoc = refQuery.docs[0];
          const referrerData = referrerDoc.data();
          const referrerId = referrerDoc.id;

          if (referrerId !== uid) {
            const existingRefQuery = await db.collection('referrals')
              .where('referredStoreId', '==', uid)
              .limit(1)
              .get();

            if (existingRefQuery.empty) {
              const referralDocRef = db.collection('referrals').doc();
              await referralDocRef.set({
                id: referralDocRef.id,
                referrerId,
                referrerSlug: referrerData.slug || refSlug,
                referrerName: referrerData.name || 'Merchant',
                referredStoreId: uid,
                referredStoreName: updated.name,
                referredStoreSlug: updated.slug,
                createdAt: new Date().toISOString(),
                status: 'joined',
                rewardAmount: 1000,
              });

              const newCount = (referrerData.referralsCount || 0) + 1;
              const newEarnings = (referrerData.referralEarnings || 0) + 1000;
              await referrerDoc.ref.update({
                referralsCount: newCount,
                referralEarnings: newEarnings,
              });
            }
          }
        }
      } catch (refErr) {
        console.warn('Error recording referral in POST /api/user/store:', refErr);
      }
    }

    invalidateStoreCache();

    return NextResponse.json({ success: true, data: storeData }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/user/store:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid token in /api/user/store PUT:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const storeRef = db.collection('stores').doc(uid);
    const storeSnapshot = await storeRef.get();

    if (!storeSnapshot.exists) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const updates = await request.json();
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    // Clean and validate updatable fields
    const updatedPayload: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await storeRef.set(updatedPayload, { merge: true });

    // If store name changed, update author name in store's products collection
    if (updates.name && updates.name !== storeSnapshot.data()?.name) {
      const prodsSnap = await storeRef.collection('products').get();
      if (!prodsSnap.empty) {
        const batch = db.batch();
        prodsSnap.forEach((doc) => {
          batch.update(doc.ref, { author: updates.name });
          const rootRef = db.collection('products').doc(doc.id);
          batch.update(rootRef, { author: updates.name });
        });
        await batch.commit();
      }
    }

    const refreshedSnapshot = await storeRef.get();
    const finalStore = { id: storeSnapshot.id, ...refreshedSnapshot.data() };

    invalidateStoreCache();

    return NextResponse.json({ success: true, data: finalStore }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/user/store:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    console.error('Invalid token in /api/user/store:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const storeRef = db.collection('stores').doc(uid);

    const [userSnapshot, storeSnapshot] = await Promise.all([
      userRef.get(),
      storeRef.get(),
    ]);

    if (!userSnapshot.exists) {
      userRef
        .set(
          {
            createdAt: new Date(),
            has_store: storeSnapshot.exists,
          },
          { merge: true }
        )
        .catch((err) => console.warn('User record init notice:', err));
    }

    if (!storeSnapshot.exists) {
      return NextResponse.json({ error: 'You have no store', has_store: false }, { status: 404 });
    }

    const storeData = storeSnapshot.data() || {};

    // Get live product count from subcollection
    let productsCount = storeData.productsCount ?? 0;
    try {
      const countSnap = await storeRef.collection('products').count().get();
      productsCount = countSnap.data().count;
    } catch {
      // fallback to storeData.productsCount
    }

    const finalStore = {
      id: storeData.id || storeSnapshot.id,
      ...storeData,
      productsCount,
    };

    return NextResponse.json({ data: finalStore }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/user/store:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}