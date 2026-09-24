import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Product } from '@/types/product';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');

    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    const products: Product[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const numStock = Number(data.stock ?? 0);
      const numPrice = Number(data.price || 0);
      const numOldPrice = data.oldPrice !== undefined && data.oldPrice !== null ? Number(data.oldPrice) : null;

      products.push({
        id: doc.id,
        name: data.name || '',
        slug: data.slug || doc.id,
        category: data.category || 'General',
        price: numPrice,
        oldPrice: numOldPrice,
        discountPercentage:
          data.discountPercentage ||
          (numOldPrice && numOldPrice > numPrice
            ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
            : undefined),
        currency: data.currency || 'NGN',
        rating: Number(data.rating ?? 5.0),
        reviewsCount: Number(data.reviewsCount ?? 0),
        image: data.image || '',
        images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.image].filter(Boolean),
        author: data.author || 'Sellora',
        description: data.description || '',
        stock: numStock,
        inStock: data.inStock !== undefined ? Boolean(data.inStock) : numStock > 0,
        sku: data.sku || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        specifications: data.specifications || {},
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      });
    });

    // Sort newest products first
    products.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Extract all unique categories from the database items
    const rawCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    const categories = ['All', ...rawCategories];

    // Filter in-memory by category if requested
    let filtered = products;
    if (categoryParam && categoryParam !== 'All') {
      filtered = filtered.filter((p) => p.category.toLowerCase() === categoryParam.toLowerCase());
    }

    // Filter by search query if requested
    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.author && p.author.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return NextResponse.json({
      success: true,
      products: filtered,
      categories,
      total: filtered.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products from DB in GET /api/products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
