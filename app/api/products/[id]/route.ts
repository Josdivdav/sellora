import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Product } from '@/types/product';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const prodDocRef = db.collection('products').doc(id);
    const docSnap = await prodDocRef.get();

    let productData: any = null;

    if (docSnap.exists) {
      productData = { id: docSnap.id, ...docSnap.data() };
    } else {
      // Try querying by slug
      const slugQuery = await db.collection('products').where('slug', '==', id).limit(1).get();
      if (!slugQuery.empty) {
        const found = slugQuery.docs[0];
        productData = { id: found.id, ...found.data() };
      }
    }

    if (!productData) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const numStock = Number(productData.stock ?? 0);
    const numPrice = Number(productData.price || 0);
    const numOldPrice = productData.oldPrice !== undefined && productData.oldPrice !== null ? Number(productData.oldPrice) : null;

    const product: Product = {
      id: productData.id,
      name: productData.name || '',
      slug: productData.slug || productData.id,
      category: productData.category || 'General',
      price: numPrice,
      oldPrice: numOldPrice,
      discountPercentage:
        productData.discountPercentage ||
        (numOldPrice && numOldPrice > numPrice
          ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
          : undefined),
      currency: productData.currency || 'NGN',
      rating: Number(productData.rating ?? 5.0),
      reviewsCount: Number(productData.reviewsCount ?? 0),
      image: productData.image || '',
      images: Array.isArray(productData.images) && productData.images.length > 0 ? productData.images : [productData.image].filter(Boolean),
      author: productData.author || 'Sellora',
      description: productData.description || '',
      stock: numStock,
      inStock: productData.inStock !== undefined ? Boolean(productData.inStock) : numStock > 0,
      sku: productData.sku || '',
      tags: Array.isArray(productData.tags) ? productData.tags : [],
      specifications: productData.specifications || {},
      createdAt: productData.createdAt || new Date().toISOString(),
      updatedAt: productData.updatedAt,
    };

    return NextResponse.json({ success: true, product }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product from DB:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
