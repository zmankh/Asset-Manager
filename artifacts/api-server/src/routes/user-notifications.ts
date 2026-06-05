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

// GET user's own notifications
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

// Mark single notification as read
router.patch("/:id/read", requireAuth, async (req: any, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("userNotifications").doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists || (docSnap.data() as any).userId !== req.user.uid) {
      return res.status(404).json({ error: "Not found" });
    }
    await ref.update({ read: true });
    res.json({ id: req.params.id, read: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// Mark all as read
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

// GET streak reminder status (admin)
router.get("/streak-reminders/status", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const settingsDoc = await db.collection("siteSettings").doc("main").get();
    const settings = settingsDoc.data() as any ?? {};
    res.json({
      enabled: settings.streakReminderEnabled ?? false,
      lastRun: settings.streakReminderLastRun ?? null,
      lastSentCount: settings.streakReminderLastSentCount ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get streak reminder status" });
  }
});

// POST manually trigger streak reminders (admin)
router.post("/streak-reminders/run", requireAdmin, async (req, res) => {
  try {
    const { runStreakReminders } = await import("../lib/streak-scheduler.js");
    const result = await runStreakReminders();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to run streak reminders" });
  }
});

// GET broadcast history (admin)
router.get("/broadcasts", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("broadcasts").get();
    const sorted = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, 30);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Failed to get broadcast history" });
  }
});

// Broadcast notification (admin)
router.post("/broadcast", requireAdmin, async (req: any, res) => {
  try {
    const db = getFirestore();
    const { title, message, type = "info", targetUserId, targetUserName } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "title and message are required" });
    }

    let sentCount = 0;

    if (targetUserId) {
      await createUserNotification(targetUserId, title, message, type);
      sentCount = 1;
    } else {
      const usersSnap = await db.collection("users").where("role", "==", "student").get();
      const batch = db.batch();
      usersSnap.docs.forEach((u) => {
        const ref = db.collection("userNotifications").doc();
        batch.set(ref, {
          userId: u.id,
          title,
          message,
          type,
          read: false,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      sentCount = usersSnap.size;
    }

    // Save broadcast history
    await db.collection("broadcasts").add({
      title,
      message,
      type,
      target: targetUserId ? "specific" : "all",
      targetUserId: targetUserId || null,
      targetUserName: targetUserName || null,
      sentCount,
      sentAt: new Date().toISOString(),
      sentBy: req.user?.uid || "admin",
    });

    res.json({ sent: sentCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to broadcast notification" });
  }
});

export default router;
