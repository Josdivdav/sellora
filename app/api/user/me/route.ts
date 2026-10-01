import { getAuth } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

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
      success: true,
      user: {
        uid,
        email: user?.email || '',
        displayName: user?.displayName || '',
        photoURL: user?.photoURL || '',
        role: user?.role || 'buyer',
        has_store: !!user?.has_store,
        phone: user?.phone || '',
        street: user?.street || '',
        city: user?.city || '',
        state: user?.state || 'Lagos',
        country: user?.country || 'Nigeria',
        postalCode: user?.postalCode || '',
        bio: user?.bio || '',
        createdAt: user?.createdAt || null,
        updatedAt: user?.updatedAt || null,
        notifications: user?.notifications || {
          orderUpdates: true,
          promotions: false,
          securityAlerts: true,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error('Invalid token in PUT /api/user/me:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      displayName,
      photoURL,
      phone,
      street,
      city,
      state,
      country,
      postalCode,
      bio,
      notifications,
    } = body;

    const userRef = db.collection('users').doc(uid);
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof displayName === 'string') updateData.displayName = displayName.trim();
    if (typeof photoURL === 'string') updateData.photoURL = photoURL.trim();
    if (typeof phone === 'string') updateData.phone = phone.trim();
    if (typeof street === 'string') updateData.street = street.trim();
    if (typeof city === 'string') updateData.city = city.trim();
    if (typeof state === 'string') updateData.state = state.trim();
    if (typeof country === 'string') updateData.country = country.trim();
    if (typeof postalCode === 'string') updateData.postalCode = postalCode.trim();
    if (typeof bio === 'string') updateData.bio = bio.trim();
    if (notifications && typeof notifications === 'object') updateData.notifications = notifications;

    await userRef.set(updateData, { merge: true });

    // Also update Firebase Auth profile if displayName or photoURL changed
    try {
      const authUpdates: Record<string, any> = {};
      if (typeof updateData.displayName === 'string' && updateData.displayName) {
        authUpdates.displayName = updateData.displayName;
      }
      if (typeof updateData.photoURL === 'string') {
        authUpdates.photoURL = updateData.photoURL;
      }
      if (Object.keys(authUpdates).length > 0) {
        await getAuth().updateUser(uid, authUpdates);
      }
    } catch (authErr) {
      console.warn('Could not update Firebase Auth user:', authErr);
    }

    const updatedSnap = await userRef.get();
    const finalData = updatedSnap.data();

    return NextResponse.json({
      success: true,
      user: {
        uid,
        email: finalData?.email || '',
        displayName: finalData?.displayName || '',
        photoURL: finalData?.photoURL || '',
        role: finalData?.role || 'buyer',
        has_store: !!finalData?.has_store,
        phone: finalData?.phone || '',
        street: finalData?.street || '',
        city: finalData?.city || '',
        state: finalData?.state || 'Lagos',
        country: finalData?.country || 'Nigeria',
        postalCode: finalData?.postalCode || '',
        bio: finalData?.bio || '',
        createdAt: finalData?.createdAt || null,
        updatedAt: finalData?.updatedAt || null,
        notifications: finalData?.notifications || {
          orderUpdates: true,
          promotions: false,
          securityAlerts: true,
        },
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
