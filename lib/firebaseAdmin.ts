import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();


const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const firebaseAdmin = initializeApp({
  credential: cert({
    projectId: requiredEnv('PROJECT_ID'),
    clientEmail: requiredEnv('CLIENT_EMAIL'),
    privateKey: requiredEnv('PRIVATE_KEY').replace(/\\n/g, '\n'),
  }),
});


export const db = getFirestore(firebaseAdmin);
export { firebaseAdmin as admin };