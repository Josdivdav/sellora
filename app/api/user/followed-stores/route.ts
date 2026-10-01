import { getAuth } from 'firebase-admin/auth';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import storesData from '@/data/stores.json';
import type { Store } from '@/types/store';

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
    console.error('Invalid token in GET /api/user/followed-stores:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const followedStoreIds: string[] = userDoc.data()?.followedStores || [];

    // Also fetch all stores from Firestore
    const storesSnap = await db.collection('stores').get();
    const firestoreStoresMap = new Map<string, Store>();

    storesSnap.forEach((doc) => {
      const data = doc.data() as Store;
      firestoreStoresMap.set(doc.id, { ...data, id: doc.id });
      if (data.slug) firestoreStoresMap.set(data.slug.toLowerCase(), { ...data, id: doc.id });
    });

    // Merge with sample stores
    const allStoresList: Store[] = [];
    const seenIds = new Set<string>();

    // Add Firestore stores
    storesSnap.forEach((doc) => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        allStoresList.push({ ...(doc.data() as Store), id: doc.id });
      }
    });

    // Add initialStoresData if not in Firestore
    (storesData as Store[]).forEach((s) => {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        const fromFs = firestoreStoresMap.get(s.id) || firestoreStoresMap.get(s.slug.toLowerCase());
        allStoresList.push(fromFs || s);
      }
    });

    return NextResponse.json({
      success: true,
      followedIds: followedStoreIds,
      stores: allStoresList,
    });
  } catch (error) {
    console.error('Error fetching followed stores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
