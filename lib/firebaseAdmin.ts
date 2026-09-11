import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
export const isFirebaseAdminConfigured = Boolean(projectId && clientEmail && privateKey);

if (!admin.apps.length && isFirebaseAdminConfigured) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}
export const adminDb = isFirebaseAdminConfigured ? admin.firestore() : null;
export const FieldValue = admin.firestore.FieldValue;
