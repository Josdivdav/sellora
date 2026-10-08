import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.PROJECT_ID;
  const clientEmail = process.env.CLIENT_EMAIL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)');
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

/**
 * Returns the Firebase Admin Auth service, ensuring the Firebase Admin App
 * is automatically initialized on demand with valid credentials.
 */
export function getAuth(): Auth {
  const app = getFirebaseAdminApp();
  return getAdminAuth(app);
}

/**
 * Verifies a Firebase Auth ID token from a client request.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  const auth = getAuth();
  return await auth.verifyIdToken(idToken);
}

export default getAuth;
