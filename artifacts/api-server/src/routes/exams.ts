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

    if (userId) {
      await db.collection("users").doc(userId).update({ lastActiveAt: new Date().toISOString() }).catch(() => {});
    }

    res.status(201).json({ sessionId: ref.id, userId, ruleId: targetRuleId, levelId, questions: selected, startedAt: sessionData.startedAt });
  } catch (err) {
    console.error("Start exam error:", err);
    res.status(500).json({ error: "Failed to start exam" });
  }
});

// Submit answer — returns result for UI feedback but does NOT update user XP
// (XP is awarded only at completion using anti-farming logic)
router.post("/:sessionId/answer", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { questionId, answerText, userId } = req.body;

    const questionDoc = await db.collection("questions").doc(questionId).get();
    if (!questionDoc.exists) return res.status(404).json({ error: "Question not found" });

    const question = questionDoc.data() as any;
    const correct = question.correctAnswer === answerText;

    await db.collection("quizAnswers").add({
      sessionId: req.params.sessionId,
      questionId, userId, answerText, correct,
      ruleId: question.ruleId,
      type: "exam",
      timestamp: new Date().toISOString(),
    });

    // Return xpAwarded = 10 for UI display only — NOT saved to DB here
    // Actual XP is awarded at exam completion with anti-farming logic
    res.json({ correct, correctAnswer: question.correctAnswer, hint: correct ? null : question.hint || null, xpAwarded: correct ? 10 : 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// Complete exam — Anti-Farming XP + per-rule progress tracking
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

    // Get rule title
    const effectiveRuleId = ruleId || level.ruleId || levelRuleIds[0];
    let ruleTitle = "قاعدة";
    if (effectiveRuleId) {
      const ruleDoc = await db.collection("grammarRules").doc(effectiveRuleId).get();
      if (ruleDoc.exists) ruleTitle = (ruleDoc.data() as any).title;
    }

    // Get existing progress for this rule (for anti-farming XP)
    const allProgressSnap = await db.collection("userProgress")
      .where("userId", "==", userId)
      .where("levelId", "==", levelId)
      .get();

    const progressDocs = allProgressSnap.docs.map(d => ({ ref: d.ref, ...d.data() as any }));
    const existingForRule = progressDocs.find((p) => p.ruleId === effectiveRuleId);

    const previousBestScore: number = existingForRule?.score ?? 0;
    const previouslyPassed: boolean = existingForRule?.passed ?? false;

    // ── Anti-Farming XP ─────────────────────────────────────────────────────
    let xpEarned = 0;
    if (score > previousBestScore) {
      // Award XP proportional to improvement over personal best
      const improvement = score - previousBestScore;
      xpEarned = Math.round(improvement); // 1 XP per 1% improvement
      if (passed && !previouslyPassed) {
        xpEarned += 50; // First-time passing bonus
      }
    } else if (score === 100 && previousBestScore === 100) {
      xpEarned = 1; // Practice bonus for perfect-score revisit
    }
    // else xpEarned = 0: no improvement, no XP

    // Update session
    await db.collection("quizSessions").doc(req.params.sessionId).update({
      completed: true, completedAt: new Date().toISOString(), score, xpEarned, passed,
    });

    // Update or create per-rule progress record
    if (!existingForRule) {
      await db.collection("userProgress").add({
        userId, levelId, levelTitle: level.title,
        ruleId: effectiveRuleId, ruleTitle,
        passed, score,
        highestScore: score,
        attempts: 1,
        completedAt: new Date().toISOString(),
      });
    } else {
      await existingForRule.ref.update({
        passed: existingForRule.passed || passed,
        score: Math.max(existingForRule.score || 0, score),
        highestScore: Math.max(existingForRule.score || 0, score),
        attempts: (existingForRule.attempts || 0) + 1,
        completedAt: new Date().toISOString(),
      });
    }

    // Check if ALL rules in the level are now passed
    const passedRuleIds = new Set(
      progressDocs.filter(p => p.passed === true).map(p => p.ruleId)
    );
    if (passed) passedRuleIds.add(effectiveRuleId);

    const allRulesPassed = levelRuleIds.length > 0 && levelRuleIds.every(rid => passedRuleIds.has(rid));

    // Award XP and advance level only when all rules passed
    let newStreak = 0;
    let nextLevelId: string | null = null;
    if (userId && xpEarned > 0) {
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
          const nextSnap = await db.collection("levels").where("active", "==", true).get();
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
    } else if (userId) {
      // Still update streak even with 0 XP
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const u = userDoc.data() as any;
        newStreak = (u.streak || 0) + 1;
        await userRef.update({ streak: newStreak });
      }
    }

    // Award badge on 100% for this specific rule
    let badgeEarned = false;
    let badge = null;
    if (score === 100 && userId && effectiveRuleId && previousBestScore < 100) {
      // Only award badge first time they get 100%
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

    // Notifications
    if (userId) {
      if (badgeEarned && badge) {
        await createUserNotification(userId, "🏅 وسام جديد!", `حصلت على وسام "${ruleTitle}" بعد إجابة 100% صحيحة!`, "badge");
      }
      if (passed && allRulesPassed) {
        await createUserNotification(userId, "🎉 اجتزت المستوى!", `أحسنت! أتممت جميع قواعد "${level.title}". ${nextLevelId ? "المستوى التالي جاهز لك." : ""}`, "level");
      } else if (passed) {
        await createUserNotification(userId, "✅ اجتزت الامتحان!", `اجتزت امتحان "${ruleTitle}" بنتيجة ${score}%.${xpEarned > 0 ? ` +${xpEarned} نقطة.` : ""}`, "exam");
      } else {
        await createUserNotification(userId, "📊 نتيجة الامتحان", `حصلت على ${score}% في "${ruleTitle}". ${score >= 50 ? "استمر للتحسين!" : "راجع القاعدة وحاول مجدداً."}`, "exam");
      }
    }

    res.json({
      score, passed, xpEarned, newStreak,
      badgeEarned, badge: badge || undefined,
      nextLevelId, allRulesPassed,
      isImprovement: score > previousBestScore,
      previousBestScore,
    });
  } catch (err) {
    console.error("Complete exam error:", err);
    res.status(500).json({ error: "Failed to complete exam" });
  }
});

export default router;
