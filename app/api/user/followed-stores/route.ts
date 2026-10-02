import { getAuth } from 'firebase-admin/auth';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Store } from '@/types/store';
import { getAllProducts } from '@/lib/getProduct';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  const isPublicRequest = request.nextUrl.searchParams.get('public') === 'true';

  let uid: string | null = null;
  if (idToken) {
    try {
      uid = (await getAuth().verifyIdToken(idToken)).uid;
    } catch (error) {
      console.error('Invalid token in GET /api/user/followed-stores:', error);
      if (!isPublicRequest) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  } else if (!isPublicRequest) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let followedStoreIds: string[] = [];
    const userOwnedStoreIds = new Set<string>();

    if (uid) {
      userOwnedStoreIds.add(uid.toLowerCase());
      const userDoc = await db.collection('users').doc(uid).get();
      followedStoreIds = userDoc.data()?.followedStores || [];

      // Check if user has an active store in stores/{uid}
      const myStoreDoc = await db.collection('stores').doc(uid).get();
      if (myStoreDoc.exists) {
        const d = myStoreDoc.data();
        if (d?.slug) userOwnedStoreIds.add(d.slug.toLowerCase());
        if (d?.name) userOwnedStoreIds.add(d.name.toLowerCase());
      }

      // Store owner can NEVER follow their own store - sanitize followed IDs
      followedStoreIds = followedStoreIds.filter(
        (id) => !userOwnedStoreIds.has(id.toLowerCase())
      );
    }

    // Fetch all products to match new arrivals & populate store topProducts
    const { products: allProducts } = await getAllProducts();

    // Fetch all real registered stores from Firestore
    const storesSnap = await db.collection('stores').get();
    const allStoresList: Store[] = [];

    storesSnap.forEach((doc) => {
      const data = doc.data();
      const isStoreOwner = Boolean(
        uid &&
        (userOwnedStoreIds.has(doc.id.toLowerCase()) ||
         (data.slug && userOwnedStoreIds.has(data.slug.toLowerCase())) ||
         (data.userId && data.userId === uid) ||
         (data.ownerId && data.ownerId === uid))
      );

      allStoresList.push({
        id: doc.id,
        name: data.name || "Store",
        slug: data.slug || doc.id,
        category: data.category || "General",
        description: data.description || "",
        logo: data.logo || "",
        banner: data.banner || "",
        rating: Number(data.rating ?? 5.0),
        reviewsCount: Number(data.reviewsCount ?? 0),
        followersCount: Number(data.followersCount ?? 0),
        productsCount: Number(data.productsCount ?? 0),
        isVerified: Boolean(data.isVerified),
        joinedDate: data.joinedDate || new Date().toISOString(),
        location: data.location || "Nigeria",
        deliverySpeed: data.deliverySpeed || "Fast Delivery",
        responseRate: data.responseRate || "100%",
        tags: Array.isArray(data.tags) ? data.tags : [],
        badge: data.badge,
        topProducts: data.topProducts || [],
        phone: data.phone || "",
        whatsapp: data.whatsapp || data.phone || "",
        isPremium: Boolean(data.isPremium || data.plan === "premium"),
        plan: (data.plan as "free" | "premium") || (data.isPremium ? "premium" : "free"),
        isOwner: isStoreOwner,
      } as Store);
    });

    // Attach topProducts for each store so StoreCard preview strip is filled with real items
    allStoresList.forEach((store) => {
      if (!store.topProducts || store.topProducts.length === 0) {
        const storeNameLower = (store.name || "").toLowerCase();
        const storeSlugLower = (store.slug || "").toLowerCase();

        const matchingProds = allProducts.filter((p) => {
          const authorLower = (p.author || "").toLowerCase();
          const pStoreId = (p.storeId || "").toLowerCase();
          return (
            (pStoreId && (pStoreId === store.id.toLowerCase() || pStoreId === storeSlugLower)) ||
            (authorLower && (authorLower === storeNameLower || authorLower === storeSlugLower))
          );
        });

        if (matchingProds.length > 0) {
          store.topProducts = matchingProds.slice(0, 4).map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image || p.images?.[0] || "/logo.png",
            category: p.category,
          }));
        }
      }
    });

    // Compute followedStores matching set (IDs, slugs, names)
    const followedSet = new Set<string>();
    followedStoreIds.forEach((id) => followedSet.add(id.toLowerCase()));

    allStoresList.forEach((s) => {
      const isFollowed =
        followedSet.has(s.id.toLowerCase()) ||
        (s.slug && followedSet.has(s.slug.toLowerCase()));

      if (isFollowed) {
        followedSet.add(s.id.toLowerCase());
        if (s.slug) followedSet.add(s.slug.toLowerCase());
        if (s.name) followedSet.add(s.name.toLowerCase());
      }
    });

    // Filter products from followed stores sorted newest first
    const newArrivals = allProducts
      .filter((p) => {
        const pStoreId = (p.storeId || "").toLowerCase();
        const pAuthor = (p.author || "").toLowerCase();
        return (pStoreId && followedSet.has(pStoreId)) || (pAuthor && followedSet.has(pAuthor));
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

    return NextResponse.json({
      success: true,
      followedIds: followedStoreIds,
      stores: allStoresList,
      newArrivals,
    });
  } catch (error) {
    console.error('Error fetching followed stores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
