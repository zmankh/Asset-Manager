---
name: Signup Firestore fix
description: Firebase Auth signup pattern — Firestore write is non-fatal, profile recreated by onAuthStateChanged
---

## Rule
In signUp(): createUserWithEmailAndPassword → updateProfile → try/catch setDoc (non-fatal).
In onAuthStateChanged: if user exists and no Firestore doc → create minimal profile.

**Why:** Firebase Auth and Firestore security rules are separate. setDoc can fail (rules not propagated yet, network, etc.) even after auth succeeds. Showing an error when the account was created confuses users. The onAuthStateChanged fallback ensures the profile eventually exists.

**How to apply:** Every time signUp is modified, keep setDoc inside try/catch that does NOT re-throw. Never move the setDoc outside the try/catch.
