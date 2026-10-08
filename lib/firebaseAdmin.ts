import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import dotenv from 'dotenv';
import { fastdb, FieldValue } from './fastdb';

dotenv.config();

let firebaseAdminApp: any = null;
try {
  const projectId = process.env.PROJECT_ID;
  const clientEmail = process.env.CLIENT_EMAIL;
  const privateKey = process.env.PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    firebaseAdminApp =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
  }
} catch (e) {
  console.warn('Firebase Admin SDK init skipped or failed:', e);
}

export const db = fastdb;
export { FieldValue };
export { firebaseAdminApp as admin, firebaseAdminApp as firebaseAdmin };