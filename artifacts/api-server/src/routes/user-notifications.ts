import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

export async function createUserNotification(
  userId: string,
  title: string,
  message: string,
  type: "badge" | "level" | "exam" | "info" | "streak"
) {
  try {
    const db = getFirestore();
    await db.collection("userNotifications").add({
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to create user notification:", err);
  }
}

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const db = getFirestore();
    const userId = req.user.uid;
    const snap = await db
      .collection("userNotifications")
      .where("userId", "==", userId)
      .get();
    const sorted = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

router.patch("/:id/read", requireAuth, async (req: any, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("userNotifications").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || (doc.data() as any).userId !== req.user.uid) {
      return res.status(404).json({ error: "Not found" });
    }
    await ref.update({ read: true });
    res.json({ id: req.params.id, read: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

router.post("/mark-all-read", requireAuth, async (req: any, res) => {
  try {
    const db = getFirestore();
    const userId = req.user.uid;
    const snap = await db
      .collection("userNotifications")
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
    res.json({ updated: snap.size });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

router.post("/broadcast", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { title, message, type = "info", targetUserId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "title and message are required" });
    }
    if (targetUserId) {
      await createUserNotification(targetUserId, title, message, type);
      return res.json({ sent: 1 });
    }
    const usersSnap = await db.collection("users").where("role", "==", "student").get();
    const batch = db.batch();
    usersSnap.docs.forEach((u) => {
      const ref = db.collection("userNotifications").doc();
      batch.set(ref, {
        userId: u.id,
        title, message, type,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    res.json({ sent: usersSnap.size });
  } catch (err) {
    res.status(500).json({ error: "Failed to broadcast notification" });
  }
});

export default router;
