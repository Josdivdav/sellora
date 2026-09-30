import { db } from "@/lib/firebaseAdmin";
import type { Product } from "@/types/product";
import staticProducts from "@/data/products.json";

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
 * 2. Checks static seed data (0.1ms)
 * 3. Checks Firestore database and caches result
 */
export async function getProductById(idOrSlug: string): Promise<Product | null> {
  if (!idOrSlug) return null;

  const key = idOrSlug.trim();
  const lowerKey = key.toLowerCase();

  // 1. In-memory cache lookup
  const cached = getFromCache(lowerKey);
  if (cached) return cached;

  // 2. Check static seed products (instant fallback / fast path)
  const foundStatic = (staticProducts as unknown as Product[]).find(
    (p) =>
      p.id.toLowerCase() === lowerKey ||
      (p.slug && p.slug.toLowerCase() === lowerKey)
  );

  if (foundStatic) {
    const formatted: Product = {
      ...foundStatic,
      inStock: foundStatic.inStock !== false,
      images:
        Array.isArray(foundStatic.images) && foundStatic.images.length > 0
          ? foundStatic.images
          : [foundStatic.image].filter(Boolean),
    };
    setInCache(formatted);
    return formatted;
  }

  // 3. Query Firestore
  try {
    const prodDocRef = db.collection("products").doc(key);
    const docSnap = await prodDocRef.get();

    let productData: any = null;

    if (docSnap.exists) {
      productData = { id: docSnap.id, ...docSnap.data() };
    } else {
      // Try querying by slug
      const slugQuery = await db
        .collection("products")
        .where("slug", "==", key)
        .limit(1)
        .get();

      if (!slugQuery.empty) {
        const foundDoc = slugQuery.docs[0];
        productData = { id: foundDoc.id, ...foundDoc.data() };
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
