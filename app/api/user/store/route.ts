import { getAuth } from 'firebase-admin/auth';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

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
    console.error('Invalid token in /api/user/store:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const storeRef = db.collection('stores').doc(uid);

    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = userSnapshot.data();

    const updated = await request.json();

    if(!updated) {
        return NextResponse.json({ error: 'Store details are missing' }, { status: 402 });
    }

    await storeRef.set(updated);
    
    await userRef.update({has_store: true});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error: ', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


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
    console.error('Invalid token in /api/user/store:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const storeRef = db.collection('stores').doc(uid);

    const userSnapshot = await userRef.get();
    const storeSnapshot = await storeRef.get();

    if (!userSnapshot.exists) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = userSnapshot.data();
    const store = storeSnapshot.data();

    if(!user?.has_store) {
      return NextResponse.json({ error: 'You have no store' }, { status: 404 });
    }

    return NextResponse.json({data: store}, { status: 200 });
  } catch (error) {
    console.error('Error: ', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}