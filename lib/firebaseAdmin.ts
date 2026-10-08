import { getFirebaseAdminApp, getAuth, verifyIdToken } from './auth';
import { fastdb, FieldValue } from './fastdb';

export const db = fastdb;
export { FieldValue, getAuth, verifyIdToken };
export const admin = {
  auth: getAuth,
};
export default admin;