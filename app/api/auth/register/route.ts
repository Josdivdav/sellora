import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';

import { db } from '@/lib/firebaseAdmin';

// export async function GET() {
//   const snapshot = await db.collection('users').get();
//   const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//   return NextResponse.json(users);
// }


export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authenticatedUid: string;
  try {
    authenticatedUid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid registration token:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { uid?: string; email?: string; displayName?: string; photoURL?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { uid, email, displayName, photoURL } = body;

  if (!uid || !email || !displayName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (uid !== authenticatedUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const existingUser = await userRef.get();

    await userRef.set({
      email,
      displayName,
      photoURL,
      ...(existingUser.exists ? {} : { createdAt: new Date() }),
    }, { merge: true });

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
