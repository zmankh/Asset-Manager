import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("notifications").orderBy("createdAt", "desc").get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { title, message, type, active } = req.body;
    const data = {
      title,
      message,
      type: type || "info",
      active: active !== undefined ? active : true,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection("notifications").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to create notification" });
  }
});

router.patch("/:notificationId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("notifications").doc(req.params.notificationId);
    await ref.update(req.body);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

router.delete("/:notificationId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection("notifications").doc(req.params.notificationId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
