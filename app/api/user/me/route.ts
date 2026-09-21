import { getAuth } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid token in /api/user/me:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userSnapshot = await db.collection('users').doc(uid).get();

    if (!userSnapshot.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const user = userSnapshot.data();
    return NextResponse.json({
      user: {
        uid,
        email: user?.email,
        displayName: user?.displayName,
        photoURL: user?.photoURL,
        role: user?.role || 'buyer',
        has_store: user?.has_store,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
