import { getAuth } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';

import { db } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Invalid login token:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uid = decodedToken.uid;

  try {
    const userRef = db.collection('users').doc(uid);
    let userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      const email = decodedToken.email || '';
      const displayName = decodedToken.name || email.split('@')[0] || 'User';
      const photoURL = decodedToken.picture || null;

      await userRef.set(
        {
          email,
          displayName,
          photoURL,
          has_store: false,
          role: 'buyer',
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      userSnapshot = await userRef.get();
    }

    const user = userSnapshot.data();
    return NextResponse.json({
      message: 'Signed in successfully',
      user: {
        uid,
        email: user?.email || decodedToken.email,
        displayName: user?.displayName || decodedToken.name,
        photoURL: user?.photoURL || decodedToken.picture,
        has_store: user?.has_store ?? false,
      },
    });
  } catch (error) {
    console.error('Error completing login:', error);
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}
