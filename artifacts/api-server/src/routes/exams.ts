import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth } from "../middlewares/auth.js";
import { createUserNotification } from "./user-notifications.js";

const router = Router();

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeRuleIds(data: any): string[] {
  if (Array.isArray(data.ruleIds) && data.ruleIds.length > 0) return data.ruleIds;
  if (data.ruleId) return [data.ruleId];
  return [];
}

// Start an exam for a specific rule within a level
router.post("/start", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { userId, levelId, ruleId } = req.body;

    const levelDoc = await db.collection("levels").doc(levelId).get();
    if (!levelDoc.exists) return res.status(404).json({ error: "Level not found" });
    const level = levelDoc.data() as any;

    if (!level.active) return res.status(400).json({ error: "Level is not active" });

    // Determine which ruleId to use
    const levelRuleIds = normalizeRuleIds(level);
    if (levelRuleIds.length === 0) return res.status(400).json({ error: "No rules configured for this level" });

    const targetRuleId = ruleId && levelRuleIds.includes(ruleId) ? ruleId : levelRuleIds[0];

    const snap = await db.collection("questions").where("ruleId", "==", targetRuleId).get();
    if (snap.empty) return res.status(400).json({ error: "No questions available for this rule" });

    const allQ = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const selected = shuffleArray(allQ).slice(0, level.questionCount || 10);

    const sessionData = {
      userId, levelId, ruleId: targetRuleId,
      questions: selected,
      type: "exam",
      startedAt: new Date().toISOString(),
      completed: false,
    };

    const ref = await db.collection("quizSessions").add(sessionData);

    // Update lastActiveAt for streak tracking
    if (userId) {
      await db.collection("users").doc(userId).update({ lastActiveAt: new Date().toISOString() }).catch(() => {});
    }

    res.status(201).json({ sessionId: ref.id, userId, ruleId: targetRuleId, levelId, questions: selected, startedAt: sessionData.startedAt });
  } catch (err) {
    console.error("Start exam error:", err);
    res.status(500).json({ error: "Failed to start exam" });
  }
});

// Submit answer
router.post("/:sessionId/answer", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { questionId, answerText, userId } = req.body;

    const questionDoc = await db.collection("questions").doc(questionId).get();
    if (!questionDoc.exists) return res.status(404).json({ error: "Question not found" });

    const question = questionDoc.data() as any;
    const correct = question.correctAnswer === answerText;
    const xpAwarded = correct ? 10 : 0;

    await db.collection("quizAnswers").add({
      sessionId: req.params.sessionId,
      questionId, userId, answerText, correct,
      ruleId: question.ruleId,
      type: "exam",
      timestamp: new Date().toISOString(),
    });

    if (correct && userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const u = userDoc.data() as any;
        await userRef.update({
          xpAnnual: (u.xpAnnual || 0) + xpAwarded,
          xpWeekly: (u.xpWeekly || 0) + xpAwarded,
        });
      }
    }

    res.json({ correct, correctAnswer: question.correctAnswer, hint: correct ? null : question.hint || null, xpAwarded });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// Complete exam — track per-rule progress, advance level only when ALL rules passed
router.post("/:sessionId/complete", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { userId, levelId, ruleId, totalCorrect, totalQuestions } = req.body;

    const score = Math.round((totalCorrect / totalQuestions) * 100);

    const levelDoc = await db.collection("levels").doc(levelId).get();
    if (!levelDoc.exists) return res.status(404).json({ error: "Level not found" });
    const level = levelDoc.data() as any;
    const levelRuleIds = normalizeRuleIds(level);

    const passed = score >= level.passingScore;
    const xpEarned = totalCorrect * 10 + (passed ? 50 : 0);

    // Update session
    await db.collection("quizSessions").doc(req.params.sessionId).update({
      completed: true, completedAt: new Date().toISOString(), score, xpEarned, passed,
    });

    // Get rule title
    const effectiveRuleId = ruleId || level.ruleId || levelRuleIds[0];
    let ruleTitle = "قاعدة";
    if (effectiveRuleId) {
      const ruleDoc = await db.collection("grammarRules").doc(effectiveRuleId).get();
      if (ruleDoc.exists) ruleTitle = (ruleDoc.data() as any).title;
    }

    // Update or create per-rule progress record
    const progressQuery = await db.collection("userProgress")
      .where("userId", "==", userId)
      .where("levelId", "==", levelId)
      .get();

    const existingForRule = progressQuery.docs.find(d => d.data().ruleId === effectiveRuleId);

    if (!existingForRule) {
      await db.collection("userProgress").add({
        userId, levelId, levelTitle: level.title,
        ruleId: effectiveRuleId, ruleTitle,
        passed, score, attempts: 1,
        completedAt: new Date().toISOString(),
      });
    } else {
      const existing = existingForRule.data() as any;
      await existingForRule.ref.update({
        passed: existing.passed || passed,
        score: Math.max(existing.score || 0, score),
        attempts: (existing.attempts || 0) + 1,
        completedAt: new Date().toISOString(),
      });
    }

    // Check if ALL rules in the level are now passed
    const allProgressSnap = await db.collection("userProgress")
      .where("userId", "==", userId)
      .where("levelId", "==", levelId)
      .get();

    const passedRuleIds = new Set(
      allProgressSnap.docs
        .filter(d => d.data().passed === true)
        .map(d => d.data().ruleId)
    );
    // Include the current rule if just passed
    if (passed) passedRuleIds.add(effectiveRuleId);

    const allRulesPassed = levelRuleIds.length > 0 && levelRuleIds.every(rid => passedRuleIds.has(rid));

    // Award XP and advance level only when all rules passed
    let newStreak = 0;
    let nextLevelId: string | null = null;
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const u = userDoc.data() as any;
        newStreak = (u.streak || 0) + 1;
        const update: any = {
          xpAnnual: (u.xpAnnual || 0) + xpEarned,
          xpWeekly: (u.xpWeekly || 0) + xpEarned,
          streak: newStreak,
        };
        if (allRulesPassed) {
          // Find next level — sort in JS to avoid composite index
          const nextSnap = await db.collection("levels")
            .where("active", "==", true)
            .get();
          const sorted = nextSnap.docs
            .map(d => ({ id: d.id, ...d.data() as any }))
            .filter(l => l.order > level.order)
            .sort((a, b) => a.order - b.order);
          if (sorted.length > 0) {
            nextLevelId = sorted[0].id;
            update.currentLevelId = nextLevelId;
          }
        }
        await userRef.update(update);
      }
    }

    // Award badge on 100% for this specific rule
    let badgeEarned = false;
    let badge = null;
    if (score === 100 && userId && effectiveRuleId) {
      const badgeSnap = await db.collection("badges")
        .where("userId", "==", userId)
        .where("ruleId", "==", effectiveRuleId)
        .limit(1).get();

      if (badgeSnap.empty) {
        const badgeData = {
          userId, ruleId: effectiveRuleId, ruleTitle,
          levelId, levelTitle: level.title,
          earnedAt: new Date().toISOString(),
        };
        const badgeRef = await db.collection("badges").add(badgeData);
        badge = { id: badgeRef.id, ...badgeData };
        badgeEarned = true;
      }
    }

    // Auto-create notifications
    if (userId) {
      if (badgeEarned && badge) {
        await createUserNotification(
          userId,
          "🏅 وسام جديد!",
          `لقد حصلت على وسام "${ruleTitle}" بعد إجابة 100% صحيحة!`,
          "badge"
        );
      }
      if (passed && allRulesPassed) {
        await createUserNotification(
          userId,
          "🎉 اجتزت المستوى!",
          `أحسنت! أتممت جميع قواعد "${level.title}". ${nextLevelId ? "المستوى التالي جاهز لك." : ""}`,
          "level"
        );
      } else if (passed) {
        await createUserNotification(
          userId,
          "✅ اجتزت الامتحان!",
          `أحسنت! اجتزت امتحان "${ruleTitle}" بنتيجة ${score}%.`,
          "exam"
        );
      } else {
        await createUserNotification(
          userId,
          "📊 نتيجة الامتحان",
          `حصلت على ${score}% في "${ruleTitle}". ${score >= 50 ? "استمر بالتدريب لتحسين نتيجتك!" : "راجع القاعدة وحاول مجدداً."}`,
          "exam"
        );
      }
    }

    res.json({ score, passed, xpEarned, newStreak, badgeEarned, badge: badge || undefined, nextLevelId, allRulesPassed });
  } catch (err) {
    console.error("Complete exam error:", err);
    res.status(500).json({ error: "Failed to complete exam" });
  }
});

export default router;
