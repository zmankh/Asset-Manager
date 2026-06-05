import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Normalize ruleIds: handles old docs with ruleId (string) and new docs with ruleIds (array)
function normalizeRuleIds(data: any): string[] {
  if (Array.isArray(data.ruleIds) && data.ruleIds.length > 0) return data.ruleIds;
  if (data.ruleId) return [data.ruleId];
  return [];
}

// Fetch rule titles for a list of ruleIds
async function fetchRules(db: FirebaseFirestore.Firestore, ruleIds: string[]) {
  if (ruleIds.length === 0) return [];
  const rules = await Promise.all(
    ruleIds.map(async (id) => {
      const doc = await db.collection("grammarRules").doc(id).get();
      return doc.exists ? { id, title: (doc.data() as any).title as string } : null;
    })
  );
  return rules.filter(Boolean) as { id: string; title: string }[];
}

function buildLevelResponse(id: string, data: any, rules: { id: string; title: string }[]) {
  const ruleIds = normalizeRuleIds(data);
  return {
    id,
    ...data,
    ruleIds,
    rules,
    // Keep ruleId for backward compat (first rule)
    ruleId: ruleIds[0] || null,
    ruleTitle: rules[0]?.title || null,
  };
}

// Seed default levels if none exist
export async function seedDefaultLevels() {
  const db = getFirestore();
  const snap = await db.collection("levels").limit(1).get();
  if (!snap.empty) return;

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
    { title: "المستوى الأول", description: "أساسيات المبتدأ والخبر", order: 1, categories: ["primary"], ruleIds: [ruleId], passingScore: 60, questionCount: 5, active: true },
    { title: "المستوى الثاني", description: "تعريف الفعل والفاعل", order: 2, categories: ["primary", "middle"], ruleIds: [ruleId], passingScore: 60, questionCount: 5, active: true },
    { title: "المستوى الثالث", description: "أحكام النعت والمنعوت", order: 3, categories: ["middle"], ruleIds: [ruleId], passingScore: 70, questionCount: 5, active: true },
    { title: "المستوى الرابع", description: "أحكام الإضافة", order: 4, categories: ["middle", "secondary"], ruleIds: [ruleId], passingScore: 70, questionCount: 5, active: true },
    { title: "المستوى الخامس", description: "أحكام الحال والتمييز", order: 5, categories: ["secondary"], ruleIds: [ruleId], passingScore: 80, questionCount: 5, active: true },
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
    const snap = await db.collection("levels").orderBy("order").get();

    const levels = [];
    for (const d of snap.docs) {
      const data = d.data() as any;
      if (req.query.category && !data.categories?.includes(req.query.category)) continue;
      const ruleIds = normalizeRuleIds(data);
      const rules = await fetchRules(db, ruleIds);
      levels.push(buildLevelResponse(d.id, data, rules));
    }

    res.json(levels);
  } catch (err) {
    console.error("List levels error:", err);
    res.status(500).json({ error: "Failed to list levels" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { title, description, order, categories, ruleIds, ruleId, passingScore, questionCount, active } = req.body;

    // Accept either ruleIds (array) or ruleId (string)
    const normalizedRuleIds: string[] = Array.isArray(ruleIds) && ruleIds.length > 0
      ? ruleIds
      : ruleId ? [ruleId] : [];

    const data = {
      title,
      description: description || null,
      order,
      categories,
      ruleIds: normalizedRuleIds,
      passingScore,
      questionCount,
      active: active !== false,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection("levels").add(data);
    const rules = await fetchRules(db, normalizedRuleIds);
    res.status(201).json(buildLevelResponse(ref.id, data, rules));
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
    const ruleIds = normalizeRuleIds(data);
    const rules = await fetchRules(db, ruleIds);
    res.json(buildLevelResponse(doc.id, data, rules));
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

    const update = { ...req.body };
    // Normalize ruleIds if provided
    if (Array.isArray(update.ruleIds)) {
      // keep as is
    } else if (update.ruleId) {
      update.ruleIds = [update.ruleId];
    }

    await ref.update(update);
    const updated = await ref.get();
    const data = updated.data() as any;
    const ruleIds = normalizeRuleIds(data);
    const rules = await fetchRules(db, ruleIds);
    res.json(buildLevelResponse(updated.id, data, rules));
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
