import admin from "firebase-admin";

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error("VITE_FIREBASE_PROJECT_ID is required");
    }

    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
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
