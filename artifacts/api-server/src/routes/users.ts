import { Router } from "express";
import { getFirestore, ADMIN_EMAIL } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("users").orderBy("createdAt", "desc").get();
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to list users" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { email, displayName, role, photoURL, schoolName, district, grade, gradeCategory } = req.body;
    const user = (req as any).user;

    const userData = {
      email,
      displayName,
      role: user.email === ADMIN_EMAIL ? (role || "student") : "student",
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

    await db.collection("users").doc(user.uid).set(userData, { merge: true });
    res.status(201).json({ id: user.uid, ...userData });
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.get("/:userId/progress", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("userProgress")
      .where("userId", "==", req.params.userId)
      .orderBy("completedAt", "desc")
      .get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to get user progress" });
  }
});

router.get("/:userId/badges", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("badges")
      .where("userId", "==", req.params.userId)
      .orderBy("earnedAt", "desc")
      .get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to get badges" });
  }
});

router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const doc = await db.collection("users").doc(req.params.userId).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.patch("/:userId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("users").doc(req.params.userId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });
    await ref.update(req.body);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/:userId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection("users").doc(req.params.userId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.patch("/:userId/streak", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("users").doc(req.params.userId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });
    await ref.update({ streak: req.body.streak });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update streak" });
  }
});

export default router;
