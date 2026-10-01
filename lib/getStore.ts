import { db } from "@/lib/firebaseAdmin";
import storesData from "@/data/stores.json";
import { getAllProducts } from "@/lib/getProduct";
import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import { slugifyStoreName, isReservedRoute } from "@/lib/storeUrl";

/**
 * In-memory cache for store data to ensure instant sub-millisecond responses
 */
interface StoreCacheEntry {
  store: Store;
  products: Product[];
  expires: number;
}

const storeCache = new Map<string, StoreCacheEntry>();
const STORE_CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export function invalidateStoreCache(slugOrId?: string) {
  if (slugOrId) {
    storeCache.delete(slugOrId.toLowerCase());
  } else {
    storeCache.clear();
  }
}

/**
 * Retrieves a store and all its associated products by slug, name, or ID.
 */
export async function getStoreBySlug(rawSlug: string): Promise<{
  store: Store | null;
  products: Product[];
}> {
  if (!rawSlug || isReservedRoute(rawSlug)) {
    return { store: null, products: [] };
  }

  const cleanSlug = decodeURIComponent(rawSlug).trim().toLowerCase().replace(/^@+/, "");

  // 1. Check in-memory cache
  const cached = storeCache.get(cleanSlug);
  if (cached && Date.now() < cached.expires) {
    return { store: cached.store, products: cached.products };
  }

  let foundStore: Store | null = null;

  // 2. Query Firestore stores collection
  try {
    // Try matching slug directly
    const slugSnap = await db.collection("stores").where("slug", "==", cleanSlug).limit(1).get();
    if (!slugSnap.empty) {
      const doc = slugSnap.docs[0];
      foundStore = { ...(doc.data() as Store), id: doc.id };
    }

    // If not found, try matching id directly
    if (!foundStore) {
      const idDoc = await db.collection("stores").doc(cleanSlug).get();
      if (idDoc.exists) {
        foundStore = { ...(idDoc.data() as Store), id: idDoc.id };
      }
    }

    // If not found, scan all stores in Firestore for case-insensitive match on name or slug
    if (!foundStore) {
      const allStoresSnap = await db.collection("stores").get();
      for (const doc of allStoresSnap.docs) {
        const data = doc.data() as Store;
        const sSlug = (data.slug || "").toLowerCase();
        const sName = (data.name || "").toLowerCase();
        const sGenerated = slugifyStoreName(data.name || "");
        if (sSlug === cleanSlug || sName === cleanSlug || sGenerated === cleanSlug || doc.id.toLowerCase() === cleanSlug) {
          foundStore = { ...data, id: doc.id };
          break;
        }
      }
    }
  } catch (err) {
    console.warn(`Firestore store lookup error for ${cleanSlug}:`, err);
  }

  // 3. Fallback to sample stores.json if not found in Firestore
  if (!foundStore) {
    const localStore = (storesData as Store[]).find((s) => {
      const sSlug = (s.slug || "").toLowerCase();
      const sName = (s.name || "").toLowerCase();
      const sGenerated = slugifyStoreName(s.name || "");
      return sSlug === cleanSlug || sName === cleanSlug || sGenerated === cleanSlug || s.id.toLowerCase() === cleanSlug;
    });

    if (localStore) {
      foundStore = { ...localStore };
    }
  }

  if (!foundStore) {
    return { store: null, products: [] };
  }

  // Ensure essential store fields are defined
  const store: Store = {
    id: foundStore.id,
    name: foundStore.name || "Merchant Store",
    slug: foundStore.slug || slugifyStoreName(foundStore.name),
    category: foundStore.category || "General",
    description: foundStore.description || "",
    logo: foundStore.logo || "",
    banner: foundStore.banner || "",
    rating: Number(foundStore.rating ?? 5.0),
    reviewsCount: Number(foundStore.reviewsCount ?? 0),
    followersCount: Number(foundStore.followersCount ?? 0),
    productsCount: Number(foundStore.productsCount ?? 0),
    isVerified: Boolean(foundStore.isVerified),
    joinedDate: foundStore.joinedDate || new Date().toISOString().split("T")[0],
    location: foundStore.location || "Nigeria",
    deliverySpeed: foundStore.deliverySpeed || "Ships within 24h",
    responseRate: foundStore.responseRate || "100%",
    tags: Array.isArray(foundStore.tags) ? foundStore.tags : [],
    badge: foundStore.badge,
    topProducts: foundStore.topProducts || [],
  };

  // 4. Fetch Products for this store
  const productsMap = new Map<string, Product>();

  try {
    // A. Query store subcollection
    const subSnap = await db.collection("stores").doc(store.id).collection("products").get();
    subSnap.forEach((doc) => {
      const data = doc.data();
      productsMap.set(doc.id, {
        id: doc.id,
        name: data.name || "",
        slug: data.slug,
        category: data.category || store.category || "General",
        price: Number(data.price || 0),
        oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
        discountPercentage: data.discountPercentage,
        currency: data.currency || "NGN",
        rating: Number(data.rating ?? 5.0),
        reviewsCount: Number(data.reviewsCount ?? 0),
        image: data.image || "",
        images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.image].filter(Boolean),
        author: data.author || store.name,
        description: data.description || "",
        stock: Number(data.stock ?? 0),
        inStock: Number(data.stock ?? 0) > 0,
        sku: data.sku || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      });
    });

    // B. Query root products collection matching storeId or author
    const [rootByStoreId, rootByAuthor] = await Promise.all([
      db.collection("products").where("storeId", "==", store.id).get().catch(() => null),
      db.collection("products").where("author", "==", store.name).get().catch(() => null),
    ]);

    if (rootByStoreId && !rootByStoreId.empty) {
      rootByStoreId.forEach((doc) => {
        if (!productsMap.has(doc.id)) {
          const data = doc.data();
          productsMap.set(doc.id, {
            id: doc.id,
            name: data.name || "",
            slug: data.slug,
            category: data.category || store.category || "General",
            price: Number(data.price || 0),
            oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
            discountPercentage: data.discountPercentage,
            currency: data.currency || "NGN",
            rating: Number(data.rating ?? 5.0),
            reviewsCount: Number(data.reviewsCount ?? 0),
            image: data.image || "",
            images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.image].filter(Boolean),
            author: data.author || store.name,
            description: data.description || "",
            stock: Number(data.stock ?? 0),
            inStock: Number(data.stock ?? 0) > 0,
            sku: data.sku || "",
            tags: Array.isArray(data.tags) ? data.tags : [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
          });
        }
      });
    }

    if (rootByAuthor && !rootByAuthor.empty) {
      rootByAuthor.forEach((doc) => {
        if (!productsMap.has(doc.id)) {
          const data = doc.data();
          productsMap.set(doc.id, {
            id: doc.id,
            name: data.name || "",
            slug: data.slug,
            category: data.category || store.category || "General",
            price: Number(data.price || 0),
            oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
            discountPercentage: data.discountPercentage,
            currency: data.currency || "NGN",
            rating: Number(data.rating ?? 5.0),
            reviewsCount: Number(data.reviewsCount ?? 0),
            image: data.image || "",
            images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.image].filter(Boolean),
            author: data.author || store.name,
            description: data.description || "",
            stock: Number(data.stock ?? 0),
            inStock: Number(data.stock ?? 0) > 0,
            sku: data.sku || "",
            tags: Array.isArray(data.tags) ? data.tags : [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
          });
        }
      });
    }
  } catch (err) {
    console.warn(`Error querying products for store ${store.id}:`, err);
  }

  // C. Fallback: filter products from global catalog if none found in store subcollection
  if (productsMap.size === 0) {
    try {
      const { products: allProds } = await getAllProducts();
      const matched = allProds.filter(
        (p) =>
          p.storeId === store.id ||
          (p.author && p.author.trim().toLowerCase() === store.name.trim().toLowerCase())
      );
      matched.forEach((p) => productsMap.set(p.id, p));
    } catch (err) {
      console.warn("Could not fallback to global products:", err);
    }
  }

  // D. Fallback to topProducts array if still empty
  if (productsMap.size === 0 && Array.isArray(store.topProducts) && store.topProducts.length > 0) {
    store.topProducts.forEach((tp: any, idx: number) => {
      const id = tp.id || `tp_${idx}`;
      productsMap.set(id, {
        id,
        name: tp.name || "Featured Item",
        category: store.category,
        price: Number(tp.price || 0),
        oldPrice: tp.oldPrice ? Number(tp.oldPrice) : null,
        currency: "NGN",
        rating: Number(tp.rating ?? 5.0),
        reviewsCount: 1,
        image: tp.image || "",
        images: [tp.image].filter(Boolean),
        author: store.name,
        description: tp.description || store.description,
        stock: 10,
        inStock: true,
        createdAt: new Date().toISOString(),
      });
    });
  }

  const products = Array.from(productsMap.values());
  store.productsCount = products.length;

  // Save to in-memory cache
  storeCache.set(cleanSlug, {
    store,
    products,
    expires: Date.now() + STORE_CACHE_TTL_MS,
  });

  return { store, products };
}
