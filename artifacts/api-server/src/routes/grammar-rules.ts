import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("grammarRules").orderBy("createdAt", "desc").get();
    const rules = await Promise.all(
      snap.docs.map(async (d) => {
        const qSnap = await db
          .collection("questions")
          .where("ruleId", "==", d.id)
          .count()
          .get();
        return { id: d.id, ...d.data(), questionCount: qSnap.data().count };
      })
    );
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: "Failed to list grammar rules" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { title, description, explanation } = req.body;
    const data = {
      title,
      description,
      explanation,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection("grammarRules").add(data);
    res.status(201).json({ id: ref.id, ...data, questionCount: 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to create grammar rule" });
  }
});

router.get("/:ruleId", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const doc = await db.collection("grammarRules").doc(req.params.ruleId).get();
    if (!doc.exists) return res.status(404).json({ error: "Rule not found" });
    const qSnap = await db
      .collection("questions")
      .where("ruleId", "==", doc.id)
      .count()
      .get();
    res.json({ id: doc.id, ...doc.data(), questionCount: qSnap.data().count });
  } catch (err) {
    res.status(500).json({ error: "Failed to get grammar rule" });
  }
});

router.patch("/:ruleId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("grammarRules").doc(req.params.ruleId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Rule not found" });
    await ref.update(req.body);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update grammar rule" });
  }
});

router.delete("/:ruleId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection("grammarRules").doc(req.params.ruleId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete grammar rule" });
  }
});

export default router;
