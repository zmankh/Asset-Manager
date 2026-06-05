import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

const DEFAULT_SETTINGS = {
  platformTitle: "نحوي",
  platformSubtitle: "تعلّم النحو العربي بطريقة ممتعة وتنافسية",
  homeWelcomeTitle: "استمر في التعلم وحقق أهدافك النحوية",
  homeAnnouncementActive: false,
  homeAnnouncementText: "",
};

router.get("/", requireAuth, async (_req, res) => {
  try {
    const db = getFirestore();
    const doc = await db.collection("siteSettings").doc("main").get();
    if (!doc.exists) {
      return res.json(DEFAULT_SETTINGS);
    }
    res.json({ ...DEFAULT_SETTINGS, ...doc.data() });
  } catch (err) {
    res.json(DEFAULT_SETTINGS);
  }
});

router.patch("/", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const allowed = [
      "platformTitle", "platformSubtitle",
      "homeWelcomeTitle", "homeAnnouncementActive", "homeAnnouncementText",
      "streakReminderEnabled",
    ];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    await db.collection("siteSettings").doc("main").set(update, { merge: true });
    const updated = await db.collection("siteSettings").doc("main").get();
    res.json({ ...DEFAULT_SETTINGS, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
