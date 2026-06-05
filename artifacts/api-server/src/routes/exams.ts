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

// Start an exam for a level
router.post("/start", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { userId, levelId } = req.body;

    const levelDoc = await db.collection("levels").doc(levelId).get();
    if (!levelDoc.exists) return res.status(404).json({ error: "Level not found" });
    const level = levelDoc.data() as any;

    if (!level.active) return res.status(400).json({ error: "Level is not active" });

    const snap = await db.collection("questions").where("ruleId", "==", level.ruleId).get();
    if (snap.empty) return res.status(400).json({ error: "No questions available for this level" });

    const allQ = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const selected = shuffleArray(allQ).slice(0, level.questionCount);

    const sessionData = {
      userId, levelId, ruleId: level.ruleId,
      questions: selected,
      type: "exam",
      startedAt: new Date().toISOString(),
      completed: false,
    };

    const ref = await db.collection("quizSessions").add(sessionData);
    res.status(201).json({ sessionId: ref.id, userId, ruleId: level.ruleId, levelId, questions: selected, startedAt: sessionData.startedAt });
  } catch (err) {
    res.status(500).json({ error: "Failed to start exam" });
  }
});

// Submit answer (same as quiz answer)
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

// Complete exam — update progress, award badge if perfect
router.post("/:sessionId/complete", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { userId, levelId, totalCorrect, totalQuestions } = req.body;

    const score = Math.round((totalCorrect / totalQuestions) * 100);

    const levelDoc = await db.collection("levels").doc(levelId).get();
    if (!levelDoc.exists) return res.status(404).json({ error: "Level not found" });
    const level = levelDoc.data() as any;
    const passed = score >= level.passingScore;
    const xpEarned = totalCorrect * 10 + (passed ? 50 : 0);

    // Update session
    await db.collection("quizSessions").doc(req.params.sessionId).update({
      completed: true, completedAt: new Date().toISOString(), score, xpEarned, passed,
    });

    // Update or create progress record
    const progressQuery = await db.collection("userProgress")
      .where("userId", "==", userId)
      .where("levelId", "==", levelId)
      .limit(1).get();

    const ruleDoc = await db.collection("grammarRules").doc(level.ruleId).get();
    const ruleTitle = ruleDoc.exists ? (ruleDoc.data() as any).title : "قاعدة";

    if (progressQuery.empty) {
      await db.collection("userProgress").add({
        userId, levelId, levelTitle: level.title,
        passed, score, attempts: 1,
        completedAt: new Date().toISOString(),
      });
    } else {
      const progressRef = progressQuery.docs[0].ref;
      const existing = progressQuery.docs[0].data() as any;
      await progressRef.update({
        passed: existing.passed || passed,
        score: Math.max(existing.score || 0, score),
        attempts: (existing.attempts || 0) + 1,
        completedAt: new Date().toISOString(),
      });
    }

    // Award XP to user
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
        if (passed) {
          // Advance to next level
          const nextSnap = await db.collection("levels")
            .where("order", ">", level.order)
            .where("active", "==", true)
            .orderBy("order").limit(1).get();
          if (!nextSnap.empty) {
            nextLevelId = nextSnap.docs[0].id;
            update.currentLevelId = nextLevelId;
          }
        }
        await userRef.update(update);
      }
    }

    // Award badge if perfect score (100%)
    let badgeEarned = false;
    let badge = null;
    if (score === 100 && userId) {
      // Check if badge already exists for this rule
      const badgeSnap = await db.collection("badges")
        .where("userId", "==", userId)
        .where("ruleId", "==", level.ruleId)
        .limit(1).get();

      if (badgeSnap.empty) {
        const badgeData = {
          userId, ruleId: level.ruleId, ruleTitle,
          levelId, levelTitle: level.title,
          earnedAt: new Date().toISOString(),
        };
        const badgeRef = await db.collection("badges").add(badgeData);
        badge = { id: badgeRef.id, ...badgeData };
        badgeEarned = true;
      }
    }

    // Auto-create user notifications
    if (userId) {
      if (badgeEarned && badge) {
        await createUserNotification(
          userId,
          "🏅 وسام جديد!",
          `لقد حصلت على وسام "${ruleTitle}" بعد إجابة 100% صحيحة!`,
          "badge"
        );
      }
      if (passed) {
        await createUserNotification(
          userId,
          "🎉 اجتزت المستوى!",
          `أحسنت! اجتزت "${level.title}" بنتيجة ${score}%. ${nextLevelId ? "المستوى التالي جاهز لك." : ""}`,
          "level"
        );
      } else {
        await createUserNotification(
          userId,
          "📊 نتيجة الامتحان",
          `حصلت على ${score}% في "${level.title}". ${score >= 50 ? "استمر بالتدريب لتحسين نتيجتك!" : "راجع القاعدة وحاول مجدداً."}`,
          "exam"
        );
      }
    }

    res.json({ score, passed, xpEarned, newStreak, badgeEarned, badge: badge || undefined, nextLevelId });
  } catch (err) {
    res.status(500).json({ error: "Failed to complete exam" });
  }
});

export default router;
