import { Router } from "express";
import { getFirestore } from "../lib/firebase-admin.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

router.post("/start", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { userId, ruleId, questionCount } = req.body;

    const snap = await db
      .collection("questions")
      .where("ruleId", "==", ruleId)
      .get();

    if (snap.empty) {
      return res.status(400).json({ error: "No questions found for this rule" });
    }

    const allQuestions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const selected = shuffleArray(allQuestions).slice(0, questionCount);

    const sessionData = {
      userId,
      ruleId,
      questions: selected,
      startedAt: new Date().toISOString(),
      completed: false,
    };

    const ref = await db.collection("quizSessions").add(sessionData);
    res.status(201).json({ sessionId: ref.id, ...sessionData });
  } catch (err) {
    res.status(500).json({ error: "Failed to start quiz" });
  }
});

router.post("/:sessionId/answer", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { questionId, answerText, userId } = req.body;

    const questionDoc = await db.collection("questions").doc(questionId).get();
    if (!questionDoc.exists) {
      return res.status(404).json({ error: "Question not found" });
    }

    const question = questionDoc.data() as any;
    const correct = question.correctAnswer === answerText;
    const xpAwarded = correct ? 10 : 0;

    await db.collection("quizAnswers").add({
      sessionId: req.params.sessionId,
      questionId,
      userId,
      answerText,
      correct,
      ruleId: question.ruleId,
      timestamp: new Date().toISOString(),
    });

    if (correct && userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data() as any;
        await userRef.update({
          xpAnnual: (userData.xpAnnual || 0) + xpAwarded,
          xpWeekly: (userData.xpWeekly || 0) + xpAwarded,
        });
      }
    }

    res.json({
      correct,
      correctAnswer: question.correctAnswer,
      hint: correct ? null : question.hint || null,
      xpAwarded,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

router.post("/:sessionId/complete", requireAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { userId, totalCorrect, totalQuestions } = req.body;

    const score = Math.round((totalCorrect / totalQuestions) * 100);
    const xpEarned = totalCorrect * 10;
    const passed = score >= 60;

    await db.collection("quizSessions").doc(req.params.sessionId).update({
      completed: true,
      completedAt: new Date().toISOString(),
      score,
      xpEarned,
      passed,
    });

    let newStreak = 0;
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data() as any;
        newStreak = (userData.streak || 0) + 1;
        await userRef.update({ streak: newStreak });
      }
    }

    res.json({ score, xpEarned, passed, newStreak });
  } catch (err) {
    res.status(500).json({ error: "Failed to complete quiz" });
  }
});

export default router;
