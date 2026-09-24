import { getAuth } from 'firebase-admin/auth';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Product } from '@/types/product';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid token in PUT /api/user/store/products/[id]:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    const storeRef = db.collection('stores').doc(uid);
    const prodRef = storeRef.collection('products').doc(id);
    const prodSnap = await prodRef.get();

    if (!prodSnap.exists) {
      return NextResponse.json({ error: 'Product not found in this store' }, { status: 404 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid product update payload' }, { status: 400 });
    }

    const existingData = prodSnap.data() || {};
    const numPrice = body.price !== undefined ? Number(body.price) : Number(existingData.price || 0);
    const numStock = body.stock !== undefined ? Number(body.stock) : Number(existingData.stock || 0);
    const numOldPrice = body.oldPrice !== undefined ? (body.oldPrice ? Number(body.oldPrice) : null) : (existingData.oldPrice ?? null);

    const updatedProduct: Product = {
      ...existingData,
      ...body,
      id,
      price: numPrice,
      stock: numStock,
      inStock: numStock > 0,
      oldPrice: numOldPrice,
      discountPercentage:
        numOldPrice && numOldPrice > numPrice
          ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
          : undefined,
      updatedAt: new Date().toISOString(),
    };

    const rootRef = db.collection('products').doc(id);

    await Promise.all([
      prodRef.set(updatedProduct, { merge: true }),
      rootRef.set({ ...updatedProduct, storeId: uid }, { merge: true }),
    ]);

    return NextResponse.json({ success: true, product: updatedProduct }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/user/store/products/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid token in DELETE /api/user/store/products/[id]:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    const storeRef = db.collection('stores').doc(uid);
    const prodRef = storeRef.collection('products').doc(id);
    const prodSnap = await prodRef.get();

    if (!prodSnap.exists) {
      return NextResponse.json({ error: 'Product not found in this store' }, { status: 404 });
    }

    const rootRef = db.collection('products').doc(id);

    await Promise.all([
      prodRef.delete(),
      rootRef.delete(),
    ]);

    // Recalculate or decrement store productsCount
    try {
      const countSnap = await storeRef.collection('products').count().get();
      await storeRef.update({
        productsCount: countSnap.data().count,
      });
    } catch {
      await storeRef.update({
        productsCount: FieldValue.increment(-1),
      });
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/user/store/products/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
