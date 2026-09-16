import { getAuth } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';

import { db } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid login token:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userSnapshot = await db.collection('users').doc(uid).get();

    if (!userSnapshot.exists) {
      return NextResponse.json({ error: 'Account profile not found' }, { status: 404 });
    }

    const user = userSnapshot.data();
    return NextResponse.json({
      message: 'Signed in successfully',
      user: {
        uid,
        email: user?.email,
        displayName: user?.displayName,
        photoURL: user?.photoURL,
      },
    });
  } catch (error) {
    console.error('Error completing login:', error);
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}
