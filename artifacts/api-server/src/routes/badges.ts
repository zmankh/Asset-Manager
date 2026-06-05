import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("badges")
      .where("userId", "==", req.params.userId)
      .get();
    const sorted = snap.docs
      .map((d) => ({ id: d.id, ...d.data() as any }))
      .sort((a, b) => (b.earnedAt || "").localeCompare(a.earnedAt || ""));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Failed to get badges" });
  }
});

export default router;
