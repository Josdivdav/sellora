import { getAuth } from '@/lib/auth';
import { NextResponse, NextRequest } from 'next/server';
import { db, FieldValue } from '@/lib/db';
import { getStoreBySlug, invalidateStoreCache } from '@/lib/getStore';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

async function isUserStoreOwner(uid: string, store: any): Promise<boolean> {
  if (!uid || !store) return false;
  if (
    uid === store.id ||
    uid === store.userId ||
    uid === store.ownerId ||
    uid === store.authorId
  ) {
    return true;
  }

  try {
    const userStoreDoc = await db.collection("stores").doc(uid).get();
    if (userStoreDoc.exists) {
      const data = userStoreDoc.data();
      const mySlug = (data?.slug || "").toLowerCase();
      const myName = (data?.name || "").toLowerCase();
      const targetSlug = (store.slug || "").toLowerCase();
      const targetName = (store.name || "").toLowerCase();
      const targetId = (store.id || "").toLowerCase();

      if (
        userStoreDoc.id.toLowerCase() === targetId ||
        (mySlug && (mySlug === targetSlug || mySlug === targetName)) ||
        (myName && (myName === targetName || myName === targetSlug))
      ) {
        return true;
      }
    }
  } catch (err) {
    console.warn("Could not check store owner document:", err);
  }

  return false;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json({ error: 'Store slug is required' }, { status: 400 });
  }

  const { store } = await getStoreBySlug(slug);

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // Read latest live followersCount directly from FastDB
  let liveCount = store.followersCount;
  try {
    const docSnap = await db.collection('stores').doc(store.id).get();
    if (docSnap.exists && typeof docSnap.data()?.followersCount === 'number') {
      liveCount = docSnap.data()?.followersCount;
    }
  } catch (err) {
    console.warn(`Could not fetch live followersCount for store ${store.id}:`, err);
  }

  // Check auth to see if requesting user is following and/or is the owner
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  let isFollowing = false;
  let isOwner = false;

  if (idToken) {
    try {
      const uid = (await getAuth().verifyIdToken(idToken)).uid;
      isOwner = await isUserStoreOwner(uid, store);

      if (isOwner) {
        // Store owner can NEVER follow their own store!
        isFollowing = false;
        // Clean up from userDoc if mistakenly added previously
        db.collection('users').doc(uid).update({
          followedStores: FieldValue.arrayRemove(store.id, store.slug)
        }).catch(() => {});
      } else {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const followedList: string[] = userDoc.data()?.followedStores || [];
          isFollowing = followedList.includes(store.id) || (Boolean(store.slug) && followedList.includes(store.slug));
        }
      }
    } catch {
      // Invalid token, treat as guest
    }
  }

  return NextResponse.json({
    followersCount: liveCount,
    isFollowing,
    isOwner,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  // 1. Guard: Check if user is logged in
  if (!idToken) {
    return NextResponse.json(
      { error: 'You must be logged in to follow a store.', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid token in follow store API:', error);
    return NextResponse.json(
      { error: 'Authentication session expired. Please sign in again.', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { slug } = await context.params;
  const { store } = await getStoreBySlug(slug);

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // 2. Guard: Check if user is the store owner
  if (await isUserStoreOwner(uid, store)) {
    return NextResponse.json(
      { error: 'You cannot follow your own store.', code: 'IS_OWNER' },
      { status: 400 }
    );
  }

  let action = 'toggle';
  try {
    const body = await request.json();
    if (body.action) action = body.action;
  } catch {
    // default to toggle
  }

  try {
    const storeRef = db.collection('stores').doc(store.id);
    const userRef = db.collection('users').doc(uid);

    // Read current user followedStores
    const userDoc = await userRef.get();
    const followedList: string[] = userDoc.data()?.followedStores || [];
    const currentlyFollowing = followedList.includes(store.id) || followedList.includes(store.slug);

    let willFollow: boolean;
    if (action === 'follow') {
      willFollow = true;
    } else if (action === 'unfollow') {
      willFollow = false;
    } else {
      willFollow = !currentlyFollowing;
    }

    // Ensure store doc exists in FastDB so increment works reliably
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) {
      await storeRef.set(
        {
          ...store,
          followersCount: store.followersCount || 0,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    const currentDbCount = storeSnap.exists
      ? (storeSnap.data()?.followersCount ?? store.followersCount ?? 0)
      : (store.followersCount ?? 0);

    // If state is already what is requested, return early
    if (willFollow === currentlyFollowing) {
      return NextResponse.json({
        success: true,
        isFollowing: currentlyFollowing,
        followersCount: currentDbCount,
      });
    }

    const batch = db.batch();

    if (willFollow) {
      batch.set(storeRef, { followersCount: FieldValue.increment(1) }, { merge: true });
      batch.set(storeRef.collection('followers').doc(uid), {
        userId: uid,
        followedAt: new Date().toISOString(),
      });
      batch.set(userRef, { followedStores: FieldValue.arrayUnion(store.id) }, { merge: true });
    } else {
      batch.set(storeRef, { followersCount: FieldValue.increment(-1) }, { merge: true });
      batch.delete(storeRef.collection('followers').doc(uid));
      batch.set(userRef, { followedStores: FieldValue.arrayRemove(store.id) }, { merge: true });
    }

    await batch.commit();
    invalidateStoreCache(store.slug);
    invalidateStoreCache(store.id);

    // Fetch refreshed live count from DB
    const refreshedStoreSnap = await storeRef.get();
    const finalCount = Math.max(0, refreshedStoreSnap.data()?.followersCount ?? 0);

    return NextResponse.json({
      success: true,
      isFollowing: willFollow,
      followersCount: finalCount,
    });
  } catch (error) {
    console.error('Error in follow store operation:', error);
    return NextResponse.json({ error: 'Failed to update follow status in database' }, { status: 500 });
  }
}
