import { NextResponse } from 'next/server';

import { db } from '@/lib/firebaseAdmin';

// export async function GET() {
//   const snapshot = await db.collection('users').get();
//   const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//   return NextResponse.json(users);
// }


export async function POST(request: Request) {
  const body = await request.json();
  const { uid, email, displayName, photoURL } = body;

  if (!uid || !email || !displayName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await db.collection('users').doc(uid).set({
      email,
      displayName,
      photoURL,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}