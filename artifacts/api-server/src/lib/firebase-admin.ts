import admin from "firebase-admin";

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!projectId) {
      throw new Error("VITE_FIREBASE_PROJECT_ID is required");
    }

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    }

    initialized = true;
  }
  return admin;
}

export function getFirestore() {
  return getFirebaseAdmin().firestore();
}

export async function verifyToken(token: string) {
  const adminInstance = getFirebaseAdmin();
  return adminInstance.auth().verifyIdToken(token);
}

export const ADMIN_EMAIL = "a.alkhdeirat@gmail.com";
