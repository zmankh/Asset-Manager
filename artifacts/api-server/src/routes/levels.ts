import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Seed default levels if none exist
export async function seedDefaultLevels() {
  const db = getFirestore();
  const snap = await db.collection("levels").limit(1).get();
  if (!snap.empty) return;

  // Seed a default grammar rule first
  const rulesSnap = await db.collection("grammarRules").limit(1).get();
  let ruleId: string;
  if (rulesSnap.empty) {
    const ruleRef = await db.collection("grammarRules").add({
      title: "المبتدأ والخبر",
      description: "تعريف المبتدأ والخبر وأنواعهما",
      explanation: "المبتدأ هو الاسم المرفوع الذي يُبنى عليه الكلام، والخبر هو ما يُتمّ به المعنى.",
      createdAt: new Date().toISOString(),
    });
    ruleId = ruleRef.id;
  } else {
    ruleId = rulesSnap.docs[0].id;
  }

  const defaultLevels = [
    { title: "المستوى الأول - المبتدأ والخبر", description: "أساسيات المبتدأ والخبر", order: 1, categories: ["primary"], ruleId, passingScore: 60, questionCount: 5, active: true },
    { title: "المستوى الثاني - الفعل والفاعل", description: "تعريف الفعل والفاعل", order: 2, categories: ["primary", "middle"], ruleId, passingScore: 60, questionCount: 5, active: true },
    { title: "المستوى الثالث - النعت والمنعوت", description: "أحكام النعت والمنعوت", order: 3, categories: ["middle"], ruleId, passingScore: 70, questionCount: 5, active: true },
    { title: "المستوى الرابع - الإضافة", description: "أحكام الإضافة", order: 4, categories: ["middle", "secondary"], ruleId, passingScore: 70, questionCount: 5, active: true },
    { title: "المستوى الخامس - الحال والتمييز", description: "أحكام الحال والتمييز", order: 5, categories: ["secondary"], ruleId, passingScore: 80, questionCount: 5, active: true },
  ];

  const batch = db.batch();
  for (const level of defaultLevels) {
    const ref = db.collection("levels").doc();
    batch.set(ref, { ...level, createdAt: new Date().toISOString() });
  }
  await batch.commit();
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    let query: FirebaseFirestore.Query = db.collection("levels").orderBy("order");
    const snap = await query.get();
    const levels = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data() as any;
        let ruleTitle: string | null = null;
        if (data.ruleId) {
          const ruleDoc = await db.collection("grammarRules").doc(data.ruleId).get();
          if (ruleDoc.exists) ruleTitle = (ruleDoc.data() as any).title;
        }
        // Filter by category if provided
        if (req.query.category && !data.categories?.includes(req.query.category)) {
          return null;
        }
        return { id: d.id, ...data, ruleTitle };
      })
    );
    res.json(levels.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Failed to list levels" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { title, description, order, categories, ruleId, passingScore, questionCount, active } = req.body;
    const data = {
      title, description: description || null, order, categories, ruleId,
      passingScore, questionCount, active: active !== false,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection("levels").add(data);
    let ruleTitle: string | null = null;
    if (ruleId) {
      const ruleDoc = await db.collection("grammarRules").doc(ruleId).get();
      if (ruleDoc.exists) ruleTitle = (ruleDoc.data() as any).title;
    }
    res.status(201).json({ id: ref.id, ...data, ruleTitle });
  } catch (err) {
    res.status(500).json({ error: "Failed to create level" });
  }
});

router.get("/:levelId", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const doc = await db.collection("levels").doc(req.params.levelId).get();
    if (!doc.exists) return res.status(404).json({ error: "Level not found" });
    const data = doc.data() as any;
    let ruleTitle: string | null = null;
    if (data.ruleId) {
      const ruleDoc = await db.collection("grammarRules").doc(data.ruleId).get();
      if (ruleDoc.exists) ruleTitle = (ruleDoc.data() as any).title;
    }
    res.json({ id: doc.id, ...data, ruleTitle });
  } catch (err) {
    res.status(500).json({ error: "Failed to get level" });
  }
});

router.patch("/:levelId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("levels").doc(req.params.levelId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Level not found" });
    await ref.update(req.body);
    const updated = await ref.get();
    const data = updated.data() as any;
    let ruleTitle: string | null = null;
    if (data.ruleId) {
      const ruleDoc = await db.collection("grammarRules").doc(data.ruleId).get();
      if (ruleDoc.exists) ruleTitle = (ruleDoc.data() as any).title;
    }
    res.json({ id: updated.id, ...data, ruleTitle });
  } catch (err) {
    res.status(500).json({ error: "Failed to update level" });
  }
});

router.delete("/:levelId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection("levels").doc(req.params.levelId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete level" });
  }
});

export default router;
