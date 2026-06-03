import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/overview", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();

    const [usersSnap, sessionsSnap, questionsSnap] = await Promise.all([
      db.collection("users").where("role", "==", "student").get(),
      db.collection("quizSessions").where("completed", "==", true).get(),
      db.collection("questions").get(),
    ]);

    const students = usersSnap.docs.map((d) => d.data() as any);
    const sessions = sessionsSnap.docs.map((d) => d.data() as any);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const activeThisWeek = sessions.filter(
      (s) => s.completedAt && s.completedAt > oneWeekAgo
    ).length;

    const avgScore =
      sessions.length > 0
        ? sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length
        : 0;

    const topStreak = students.reduce(
      (max, u) => Math.max(max, u.streak || 0),
      0
    );

    res.json({
      totalStudents: usersSnap.size,
      totalQuizzes: sessionsSnap.size,
      totalQuestions: questionsSnap.size,
      averageScore: Math.round(avgScore * 10) / 10,
      activeThisWeek,
      topStreak,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get analytics overview" });
  }
});

router.get("/rules", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();

    const [rulesSnap, answersSnap] = await Promise.all([
      db.collection("grammarRules").get(),
      db.collection("quizAnswers").get(),
    ]);

    const rules = rulesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const answers = answersSnap.docs.map((d) => d.data() as any);

    const analytics = rules.map((rule) => {
      const ruleAnswers = answers.filter((a) => a.ruleId === rule.id);
      const totalAttempts = ruleAnswers.length;
      const correctAttempts = ruleAnswers.filter((a) => a.correct).length;
      const failureRate =
        totalAttempts > 0
          ? Math.round(((totalAttempts - correctAttempts) / totalAttempts) * 100) / 100
          : 0;

      return {
        ruleId: rule.id,
        title: rule.title,
        totalAttempts,
        correctAttempts,
        failureRate,
        flagged: failureRate > 0.4,
      };
    });

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: "Failed to get analytics by rule" });
  }
});

router.get("/weaknesses", requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();

    const [rulesSnap, answersSnap] = await Promise.all([
      db.collection("grammarRules").get(),
      db.collection("quizAnswers").get(),
    ]);

    const rules = rulesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const answers = answersSnap.docs.map((d) => d.data() as any);

    const weaknesses = rules
      .map((rule) => {
        const ruleAnswers = answers.filter((a) => a.ruleId === rule.id);
        const totalAttempts = ruleAnswers.length;
        const correctAttempts = ruleAnswers.filter((a) => a.correct).length;
        const failureRate =
          totalAttempts > 0
            ? Math.round(((totalAttempts - correctAttempts) / totalAttempts) * 100) / 100
            : 0;

        return {
          ruleId: rule.id,
          title: rule.title,
          totalAttempts,
          correctAttempts,
          failureRate,
          flagged: failureRate > 0.4,
        };
      })
      .filter((r) => r.flagged)
      .sort((a, b) => b.failureRate - a.failureRate);

    res.json(weaknesses);
  } catch (err) {
    res.status(500).json({ error: "Failed to get weakness analysis" });
  }
});

export default router;
