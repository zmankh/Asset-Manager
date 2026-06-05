import { Router } from "express";
import { getFirestore, getFirebaseAdmin, ADMIN_EMAIL } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// List all users (admin) — syncs from Firebase Auth to Firestore
router.get("/", requireAdmin, async (req, res) => {
  try {
    const adminInstance = getFirebaseAdmin();
    const db = getFirestore();

    // Pull ALL Firebase Auth users (handles pagination)
    let allAuthUsers: any[] = [];
    let nextPageToken: string | undefined;
    do {
      const result = await adminInstance.auth().listUsers(1000, nextPageToken);
      allAuthUsers = allAuthUsers.concat(result.users);
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    // Load existing Firestore docs
    const snap = await db.collection("users").get();
    const firestoreMap = new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() as any }]));

    // Merge: auto-create Firestore doc for any Auth user missing one
    const batch = db.batch();
    let needsCommit = false;

    const users = allAuthUsers.map((authUser) => {
      const existing = firestoreMap.get(authUser.uid) as any;
      if (existing) return existing;

      const profile = {
        email: authUser.email || null,
        displayName: authUser.displayName || authUser.email || null,
        role: authUser.email === ADMIN_EMAIL ? "admin" : "student",
        schoolName: null,
        district: null,
        grade: null,
        gradeCategory: null,
        xpAnnual: 0,
        xpWeekly: 0,
        streak: 0,
        currentLevelId: null,
        title: null,
        photoURL: authUser.photoURL || null,
        createdAt: authUser.metadata?.creationTime || new Date().toISOString(),
      };
      batch.set(db.collection("users").doc(authUser.uid), profile);
      needsCommit = true;
      return { id: authUser.uid, ...profile };
    });

    if (needsCommit) await batch.commit();

    // Sort by createdAt descending
    users.sort((a: any, b: any) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// Create / upsert user profile
router.post("/", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { email, displayName, role, photoURL, schoolName, district, grade, gradeCategory } = req.body;
    const reqUser = (req as any).user;

    const userData = {
      email,
      displayName,
      role: reqUser.email === ADMIN_EMAIL ? (role || "student") : "student",
      schoolName: schoolName || null,
      district: district || null,
      grade: grade || null,
      gradeCategory: gradeCategory || null,
      xpAnnual: 0,
      xpWeekly: 0,
      streak: 0,
      currentLevelId: null,
      title: null,
      photoURL: photoURL || null,
      createdAt: new Date().toISOString(),
    };

    await db.collection("users").doc(reqUser.uid).set(userData, { merge: true });
    res.status(201).json({ id: reqUser.uid, ...userData });
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get user progress
router.get("/:userId/progress", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("userProgress")
      .where("userId", "==", req.params.userId)
      .get();
    const sorted = snap.docs
      .map((d) => ({ id: d.id, ...d.data() as any }))
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Failed to get user progress" });
  }
});

// Get user badges
router.get("/:userId/badges", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("badges")
      .where("userId", "==", req.params.userId)
      .get();
    const sorted = snap.docs
      .map((d) => ({ id: d.id, ...d.data() as any }))
      .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Failed to get badges" });
  }
});

// Get single user — auto-creates document if missing (self-access only)
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const reqUser = (req as any).user;
    const ref = db.collection("users").doc(req.params.userId);
    const docSnap = await ref.get();

    if (docSnap.exists) {
      return res.json({ id: docSnap.id, ...docSnap.data() });
    }

    if (reqUser.uid === req.params.userId) {
      const autoProfile = {
        email: reqUser.email || null,
        displayName: reqUser.name || reqUser.email || null,
        role: reqUser.email === ADMIN_EMAIL ? "admin" : "student",
        schoolName: null,
        district: null,
        grade: null,
        gradeCategory: null,
        xpAnnual: 0,
        xpWeekly: 0,
        streak: 0,
        currentLevelId: null,
        title: null,
        photoURL: reqUser.picture || null,
        createdAt: new Date().toISOString(),
      };
      await ref.set(autoProfile);
      return res.json({ id: req.params.userId, ...autoProfile });
    }

    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Update user (admin)
router.patch("/:userId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("users").doc(req.params.userId);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "User not found" });
    await ref.update(req.body);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user (admin)
router.delete("/:userId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection("users").doc(req.params.userId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Get per-level progress summary for a user (admin or self)
router.get("/:userId/level-progress", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();

    // Fetch all levels (sorted by order field — single-field index is fine)
    const levelsSnap = await db.collection("levels").orderBy("order").get();
    const levels = levelsSnap.docs.map((d) => {
      const data = d.data() as any;
      const ruleIds: string[] = Array.isArray(data.ruleIds) && data.ruleIds.length > 0
        ? data.ruleIds
        : data.ruleId ? [data.ruleId] : [];
      return { id: d.id, ...data, ruleIds };
    });

    // Fetch all progress docs for this user (no composite index needed — two == conditions)
    const progressSnap = await db.collection("userProgress")
      .where("userId", "==", req.params.userId)
      .get();
    const progressDocs = progressSnap.docs.map((d) => ({ id: d.id, ...d.data() as any }));

    // Build per-level summary
    const summary = await Promise.all(
      levels.map(async (level) => {
        const levelProgress = progressDocs.filter((p) => p.levelId === level.id);

        // Fetch rule titles
        const rules = await Promise.all(
          level.ruleIds.map(async (ruleId: string) => {
            const ruleDoc = await db.collection("grammarRules").doc(ruleId).get();
            const ruleTitle = ruleDoc.exists ? (ruleDoc.data() as any).title : ruleId;
            const progressForRule = levelProgress.find((p) => p.ruleId === ruleId);
            return {
              ruleId,
              ruleTitle,
              attempted: !!progressForRule,
              passed: progressForRule?.passed ?? false,
              bestScore: progressForRule?.score ?? null,
              attempts: progressForRule?.attempts ?? 0,
              lastAttempt: progressForRule?.completedAt ?? null,
            };
          })
        );

        const rulesPassed = rules.filter((r) => r.passed).length;
        const rulesTotal = rules.length;
        const levelPassed = rulesTotal > 0 && rulesPassed === rulesTotal;
        const lastAttempt = rules
          .map((r) => r.lastAttempt)
          .filter(Boolean)
          .sort()
          .reverse()[0] ?? null;

        return {
          levelId: level.id,
          levelTitle: level.title,
          levelOrder: level.order,
          categories: level.categories || [],
          active: level.active,
          rulesTotal,
          rulesPassed,
          percent: rulesTotal > 0 ? Math.round((rulesPassed / rulesTotal) * 100) : 0,
          levelPassed,
          lastAttempt,
          rules,
        };
      })
    );

    res.json(summary);
  } catch (err) {
    console.error("Level progress error:", err);
    res.status(500).json({ error: "Failed to get level progress" });
  }
});

// Update streak
router.patch("/:userId/streak", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("users").doc(req.params.userId);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "User not found" });
    await ref.update({ streak: req.body.streak });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update streak" });
  }
});

export default router;
