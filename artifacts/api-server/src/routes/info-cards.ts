import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("infoCards").orderBy("order").get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to list info cards" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { title, content, icon, active, order } = req.body;
    const data = {
      title,
      content,
      icon: icon || null,
      active: active !== undefined ? active : true,
      order: order || 0,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection("infoCards").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to create info card" });
  }
});

router.patch("/:cardId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("infoCards").doc(req.params.cardId);
    await ref.update(req.body);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update info card" });
  }
});

router.delete("/:cardId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection("infoCards").doc(req.params.cardId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete info card" });
  }
});

export default router;
