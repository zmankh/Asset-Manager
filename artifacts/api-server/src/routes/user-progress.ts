import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/:userId", requireAuth, async (req, res) => {
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

export default router;
