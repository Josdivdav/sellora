import { db } from "@/lib/firebaseAdmin";
import type { Product } from "@/types/product";
import type { Store } from "@/types/store";
import { shuffleArray } from "@/lib/shuffle";

// In-memory cache with 5-minute TTL to ensure sub-millisecond retrieval
interface CachedItem {
  product: Product;
  expires: number;
}

const productCache = new Map<string, CachedItem>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getFromCache(idOrSlug: string): Product | null {
  const cached = productCache.get(idOrSlug.toLowerCase());
  if (cached) {
    if (Date.now() < cached.expires) {
      return cached.product;
    }
    productCache.delete(idOrSlug.toLowerCase());
  }
  return null;
}

function setInCache(product: Product) {
  const expires = Date.now() + CACHE_TTL_MS;
  if (product.id) {
    productCache.set(product.id.toLowerCase(), { product, expires });
  }
  if (product.slug) {
    productCache.set(product.slug.toLowerCase(), { product, expires });
  }
}

/**
 * High-performance server-side product resolver.
 * 1. Checks memory cache (0.05ms)
 * 2. Checks Firestore database (root products or store subcollections)
 */
export async function getProductById(idOrSlug: string): Promise<Product | null> {
  if (!idOrSlug) return null;

  const key = idOrSlug.trim();
  const lowerKey = key.toLowerCase();

  // 1. In-memory cache lookup
  const cached = getFromCache(lowerKey);
  if (cached) return cached;

  // 2. Query Firestore
  try {
    const prodDocRef = db.collection("products").doc(key);
    const docSnap = await prodDocRef.get();

    let productData: any = null;

    if (docSnap.exists) {
      productData = { id: docSnap.id, ...docSnap.data() };
    } else {
      // Try querying by slug in collectionGroup
      const slugQuery = await db
        .collectionGroup("products")
        .where("slug", "==", key)
        .limit(1)
        .get();

      if (!slugQuery.empty) {
        const foundDoc = slugQuery.docs[0];
        const data = foundDoc.data();
        const storeId =
          data.storeId ||
          data.merchantId ||
          data.userId ||
          foundDoc.ref.parent?.parent?.id ||
          undefined;
        productData = { id: foundDoc.id, ...data, storeId };
      } else {
        // Try querying by ID in collectionGroup (for products stored in store subcollections)
        const allGroup = await db.collectionGroup("products").get();
        const found = allGroup.docs.find(
          (d) =>
            d.id === key ||
            d.id.toLowerCase() === lowerKey ||
            (d.data().slug && d.data().slug.toLowerCase() === lowerKey)
        );
        if (found) {
          const data = found.data();
          const storeId =
            data.storeId ||
            data.merchantId ||
            data.userId ||
            found.ref.parent?.parent?.id ||
            undefined;
          productData = { id: found.id, ...data, storeId };
        }
      }
    }

    if (!productData) {
      return null;
    }

    const numStock = Number(productData.stock ?? 0);
    const numPrice = Number(productData.price || 0);
    const numOldPrice =
      productData.oldPrice !== undefined && productData.oldPrice !== null
        ? Number(productData.oldPrice)
        : null;

    const resolvedProduct: Product = {
      id: productData.id,
      name: productData.name || "",
      slug: productData.slug || productData.id,
      category: productData.category || "General",
      price: numPrice,
      oldPrice: numOldPrice,
      discountPercentage:
        productData.discountPercentage ||
        (numOldPrice && numOldPrice > numPrice
          ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
          : undefined),
      currency: productData.currency || "NGN",
      rating: Number(productData.rating ?? 5.0),
      reviewsCount: Number(productData.reviewsCount ?? 0),
      image: productData.image || "",
      images:
        Array.isArray(productData.images) && productData.images.length > 0
          ? productData.images
          : [productData.image].filter(Boolean),
      author: productData.author || "Sellora",
      storeId:
        productData.storeId ||
        productData.merchantId ||
        productData.userId ||
        undefined,
      description: productData.description || "",
      stock: numStock,
      inStock:
        productData.inStock !== undefined
          ? Boolean(productData.inStock)
          : numStock > 0,
      sku: productData.sku || "",
      tags: Array.isArray(productData.tags) ? productData.tags : [],
      specifications: productData.specifications || {},
      createdAt: productData.createdAt || new Date().toISOString(),
      updatedAt: productData.updatedAt,
    };

    setInCache(resolvedProduct);
    return resolvedProduct;
  } catch (err) {
    console.warn(`Could not fetch product ${key} from Firestore:`, err);
    return null;
  }
}

interface CachedAllProducts {
  products: Product[];
  categories: string[];
  stores: Store[];
  expires: number;
}

let allProductsCache: CachedAllProducts | null = null;
const ALL_PRODUCTS_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function invalidateProductsCache() {
  allProductsCache = null;
  productCache.clear();
}

/**
 * High-performance server-side resolver for all live products.
 * Queries live Firestore database and uses an in-memory cache to serve in < 1ms.
 */
export async function getAllProducts(): Promise<{
  products: Product[];
  categories: string[];
  stores: Store[];
}> {
  // 1. In-memory cache hit - returns newly randomized array of products
  if (allProductsCache && Date.now() < allProductsCache.expires) {
    return {
      products: shuffleArray(allProductsCache.products),
      categories: allProductsCache.categories,
      stores: allProductsCache.stores,
    };
  }

  try {
    // Query all live products in Firestore
    const snapshot = await db.collectionGroup("products").get();

    const dbProductsMap = new Map<string, Product>();
    snapshot.forEach((doc) => {
      if (dbProductsMap.has(doc.id)) return;
      const data = doc.data();
      const numStock = Number(data.stock ?? 0);
      const numPrice = Number(data.price || 0);
      const numOldPrice =
        data.oldPrice !== undefined && data.oldPrice !== null
          ? Number(data.oldPrice)
          : null;

      const storeId =
        data.storeId ||
        data.merchantId ||
        data.userId ||
        doc.ref.parent?.parent?.id ||
        undefined;

      dbProductsMap.set(doc.id, {
        id: doc.id,
        name: data.name || "",
        slug: data.slug || doc.id,
        category: data.category || "General",
        price: numPrice,
        oldPrice: numOldPrice,
        discountPercentage:
          data.discountPercentage ||
          (numOldPrice && numOldPrice > numPrice
            ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
            : undefined),
        currency: data.currency || "NGN",
        rating: Number(data.rating ?? 5.0),
        reviewsCount: Number(data.reviewsCount ?? 0),
        image: data.image || "",
        images:
          Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : [data.image].filter(Boolean),
        author: data.author || "Sellora",
        storeId,
        description: data.description || "",
        stock: numStock,
        inStock:
          data.inStock !== undefined ? Boolean(data.inStock) : numStock > 0,
        sku: data.sku || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        specifications: data.specifications || {},
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      });
    });

    const dbProducts = Array.from(dbProductsMap.values());

    // Fetch registered stores from Firestore
    const storesSnap = await db.collection("stores").get();
    const dbStores: Store[] = [];
    storesSnap.forEach((doc) => {
      const data = doc.data();
      dbStores.push({
        id: doc.id,
        name: data.name || "",
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
        deliverySpeed: data.deliverySpeed || "Standard",
        responseRate: data.responseRate || "100%",
        tags: Array.isArray(data.tags) ? data.tags : [],
        badge: data.badge,
        topProducts: data.topProducts || [],
        phone: data.phone || "",
        whatsapp: data.whatsapp || data.phone || "",
        bankDetails: data.bankDetails || undefined,
      });
    });

    // Sort newest products first
    dbProducts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const rawCategories = Array.from(
      new Set(dbProducts.map((p) => p.category).filter(Boolean))
    );
    const categories = ["All", ...rawCategories];

    allProductsCache = {
      products: dbProducts,
      categories,
      stores: dbStores,
      expires: Date.now() + ALL_PRODUCTS_TTL_MS,
    };

    return { products: shuffleArray(dbProducts), categories, stores: dbStores };
  } catch (err) {
    console.error("Could not fetch products from Firestore:", err);
    return { products: [], categories: ["All"], stores: [] };
  }
}
