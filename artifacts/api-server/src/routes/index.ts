import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import usersRouter from "./users.js";
import grammarRulesRouter from "./grammar-rules.js";
import questionsRouter from "./questions.js";
import quizzesRouter from "./quizzes.js";
import levelsRouter from "./levels.js";
import examsRouter from "./exams.js";
import badgesRouter from "./badges.js";
import userProgressRouter from "./user-progress.js";
import leaderboardRouter from "./leaderboard.js";
import notificationsRouter from "./notifications.js";
import analyticsRouter from "./analytics.js";
import infoCardsRouter from "./info-cards.js";
import { seedDefaultLevels } from "./levels.js";
import settingsRouter from "./settings.js";

const router: IRouter = Router();

// Seed default data on startup
seedDefaultLevels().catch((e) => console.warn("Seed skipped:", e?.message));

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/grammar-rules", grammarRulesRouter);
router.use("/questions", questionsRouter);
router.use("/quizzes", quizzesRouter);
router.use("/levels", levelsRouter);
router.use("/exams", examsRouter);
router.use("/badges", badgesRouter);
router.use("/user-progress", userProgressRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/notifications", notificationsRouter);
router.use("/analytics", analyticsRouter);
router.use("/info-cards", infoCardsRouter);
router.use("/settings", settingsRouter);

export default router;
