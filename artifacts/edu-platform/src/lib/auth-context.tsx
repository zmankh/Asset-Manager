import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "./firebase";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { app } from "./firebase";

const db = getFirestore(app);

export type GradeCategory = "primary" | "middle" | "secondary";

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  schoolName: string;
  district: string;
  grade: string;
  gradeCategory: GradeCategory;
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_EMAIL = "a.alkhdeirat@gmail.com";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Ensure Firestore profile exists for signed-in non-admin users
      if (currentUser && currentUser.email !== ADMIN_EMAIL) {
        try {
          const ref = doc(db, "users", currentUser.uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, {
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email,
              role: "student",
              schoolName: null,
              district: null,
              grade: null,
              gradeCategory: null,
              xpAnnual: 0,
              xpWeekly: 0,
              streak: 0,
              currentLevelId: null,
              title: null,
              photoURL: null,
              createdAt: new Date().toISOString(),
            });
          }
        } catch {
          // Non-fatal: profile sync happens in background
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async ({ email, password, displayName, schoolName, district, grade, gradeCategory }: SignUpData) => {
    // Step 1: Create Firebase Auth account
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Step 2: Set display name
    await updateProfile(credential.user, { displayName });

    // Step 3: Write Firestore profile — failure is non-fatal, onAuthStateChanged will retry
    try {
      await setDoc(doc(db, "users", credential.user.uid), {
        email,
        displayName,
        schoolName,
        district,
        grade,
        gradeCategory,
        role: "student",
        xpAnnual: 0,
        xpWeekly: 0,
        streak: 0,
        currentLevelId: null,
        title: null,
        photoURL: null,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Auth succeeded — profile will be created by onAuthStateChanged fallback
    }
    // Don't throw here — auth succeeded, user is in
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
