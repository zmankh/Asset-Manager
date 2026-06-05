import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

async function buildLeaderboard(type: "annual" | "weekly") {
  const db = getFirestore();
  const field = type === "annual" ? "xpAnnual" : "xpWeekly";

  const snap = await db
    .collection("users")
    .where("role", "==", "student")
    .get();

  const titlesSnap = await db.collection("leaderboardTitles").get();
  const titles = titlesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

  const sorted = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .sort((a, b) => (b[field] || 0) - (a[field] || 0))
    .slice(0, 50);

  const entries = sorted.map((data, i) => {
    const rank = i + 1;
    const matchedTitle = titles.find(
      (t: any) => rank >= t.minRank && rank <= t.maxRank
    );
    return {
      rank,
      userId: data.id,
      displayName: data.displayName,
      xp: data[field] || 0,
      title: matchedTitle ? matchedTitle.title : data.title || null,
      photoURL: data.photoURL || null,
      streak: data.streak || 0,
    };
  });

  return { type, entries, updatedAt: new Date().toISOString() };
}

router.get("/annual", requireAuth, async (req, res) => {
  try {
    res.json(await buildLeaderboard("annual"));
  } catch (err) {
    res.status(500).json({ error: "Failed to get annual leaderboard" });
  }
});

router.get("/weekly", requireAuth, async (req, res) => {
  try {
    res.json(await buildLeaderboard("weekly"));
  } catch (err) {
    res.status(500).json({ error: "Failed to get weekly leaderboard" });
  }
});

router.get("/titles", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("leaderboardTitles").orderBy("minRank").get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to list leaderboard titles" });
  }
});

router.post("/titles", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const { title, minRank, maxRank, description } = req.body;
    const data = { title, minRank, maxRank, description: description || null };
    const ref = await db.collection("leaderboardTitles").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to create leaderboard title" });
  }
});

router.patch("/titles/:titleId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection("leaderboardTitles").doc(req.params.titleId);
    await ref.update(req.body);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update leaderboard title" });
  }
});

router.delete("/titles/:titleId", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection("leaderboardTitles").doc(req.params.titleId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete leaderboard title" });
  }
});

export default router;
