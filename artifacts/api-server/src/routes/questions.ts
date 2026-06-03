import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    let query: FirebaseFirestore.Query = db.collection("questions");
    if (req.query.ruleId) {
      query = query.where("ruleId", "==", req.query.ruleId as string);
    }
    const snap = await query.orderBy("createdAt", "desc").get();
    const questions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to list questions" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { ruleId, questionText, options, correctAnswer, hint } = req.body;
    const data = {
      ruleId,
      questionText,
      options,
      correctAnswer,
      hint: hint || null,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection("questions").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to create question" });
  }
});

router.post("/bulk", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { questions } = req.body as {
      questions: {
        ruleId: string;
        questionText: string;
        options: string[];
        correctAnswer: string;
        hint?: string;
      }[];
    };

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    const batch = db.batch();
    for (const q of questions) {
      try {
        const ref = db.collection("questions").doc();
        batch.set(ref, {
          ruleId: q.ruleId,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          hint: q.hint || null,
          createdAt: new Date().toISOString(),
        });
        created++;
      } catch (e: any) {
        failed++;
        errors.push(e.message);
      }
    }
    await batch.commit();

    res.status(201).json({ created, failed, errors });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk create questions" });
  }
});

router.patch("/:questionId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("questions").doc(req.params.questionId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Question not found" });
    await ref.update(req.body);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update question" });
  }
});

router.delete("/:questionId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection("questions").doc(req.params.questionId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete question" });
  }
});

export default router;
