import { getAuth } from 'firebase-admin/auth';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Product } from '@/types/product';

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
    console.error('Invalid token in GET /api/user/store/products:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const storeRef = db.collection('stores').doc(uid);
    const storeSnap = await storeRef.get();

    if (!storeSnap.exists) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const prodsSnap = await storeRef.collection('products').get();

    const products: Product[] = [];
    prodsSnap.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.name || '',
        slug: data.slug,
        category: data.category || 'General',
        price: Number(data.price || 0),
        oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
        discountPercentage: data.discountPercentage,
        currency: data.currency || 'NGN',
        rating: data.rating ?? 5.0,
        reviewsCount: data.reviewsCount ?? 0,
        image: data.image || '',
        images: Array.isArray(data.images) ? data.images : [data.image].filter(Boolean),
        author: data.author || storeSnap.data()?.name || 'My Store',
        description: data.description || '',
        stock: Number(data.stock ?? 0),
        inStock: Number(data.stock ?? 0) > 0,
        sku: data.sku || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      });
    });

    // Sort newest first
    products.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/user/store/products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    console.error('Invalid token in POST /api/user/store/products:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const storeRef = db.collection('stores').doc(uid);
    const storeSnap = await storeRef.get();

    if (!storeSnap.exists) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const storeData = storeSnap.data() || {};
    const body = await request.json();

    if (!body) {
      return NextResponse.json({ error: 'Product payload is missing' }, { status: 400 });
    }

    // Support batch seed / sync of multiple products (useful for initial import or starter products)
    if (body.action === 'batch' && Array.isArray(body.products)) {
      const batch = db.batch();
      const createdProducts: Product[] = [];

      for (const item of body.products) {
        if (!item.name || typeof item.price !== 'number') continue;
        const productId = item.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const numStock = Number(item.stock ?? 0);

        const newProduct: Product = {
          id: productId,
          name: item.name.trim(),
          slug,
          category: item.category || storeData.category || 'General',
          price: Number(item.price),
          oldPrice: item.oldPrice ? Number(item.oldPrice) : null,
          discountPercentage: item.discountPercentage || (item.oldPrice && item.oldPrice > item.price ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100) : undefined),
          currency: item.currency || 'NGN',
          rating: item.rating ?? 5.0,
          reviewsCount: item.reviewsCount ?? 0,
          image: item.image || '',
          images: Array.isArray(item.images) && item.images.length > 0 ? item.images : [item.image].filter(Boolean),
          author: storeData.name || item.author || 'My Store',
          description: item.description || '',
          stock: numStock,
          inStock: numStock > 0,
          sku: item.sku || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const subRef = storeRef.collection('products').doc(productId);
        const rootRef = db.collection('products').doc(productId);
        batch.set(subRef, newProduct);
        batch.set(rootRef, { ...newProduct, storeId: uid });
        createdProducts.push(newProduct);
      }

      await batch.commit();

      // Update store productsCount
      const countSnap = await storeRef.collection('products').count().get();
      await storeRef.update({
        productsCount: countSnap.data().count,
        topProducts: createdProducts.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          oldPrice: p.oldPrice,
          image: p.image,
          rating: p.rating,
        })),
      });

      return NextResponse.json({ success: true, count: createdProducts.length, products: createdProducts }, { status: 201 });
    }

    // Single product creation
    const { name, price } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return NextResponse.json({ error: 'Valid selling price is required' }, { status: 400 });
    }

    const productId = body.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const numStock = Number(body.stock ?? 0);
    const numOldPrice = body.oldPrice ? Number(body.oldPrice) : null;
    const slug = body.slug || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const newProduct: Product = {
      id: productId,
      name: name.trim(),
      slug,
      category: body.category || storeData.category || 'General',
      price: numPrice,
      oldPrice: numOldPrice,
      discountPercentage: body.discountPercentage || (numOldPrice && numOldPrice > numPrice ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100) : undefined),
      currency: body.currency || 'NGN',
      rating: body.rating ?? 5.0,
      reviewsCount: body.reviewsCount ?? 0,
      image: body.image || '',
      images: Array.isArray(body.images) && body.images.length > 0 ? body.images : [body.image].filter(Boolean),
      author: storeData.name || body.author || 'My Store',
      description: body.description || '',
      stock: numStock,
      inStock: numStock > 0,
      sku: body.sku || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const subDocRef = storeRef.collection('products').doc(productId);
    const rootDocRef = db.collection('products').doc(productId);

    await Promise.all([
      subDocRef.set(newProduct),
      rootDocRef.set({ ...newProduct, storeId: uid }),
    ]);

    // Update store count and top products
    try {
      const countSnap = await storeRef.collection('products').count().get();
      await storeRef.update({
        productsCount: countSnap.data().count,
      });
    } catch {
      await storeRef.update({
        productsCount: FieldValue.increment(1),
      });
    }

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/user/store/products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
