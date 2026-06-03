import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import usersRouter from "./users.js";
import grammarRulesRouter from "./grammar-rules.js";
import questionsRouter from "./questions.js";
import quizzesRouter from "./quizzes.js";
import leaderboardRouter from "./leaderboard.js";
import notificationsRouter from "./notifications.js";
import analyticsRouter from "./analytics.js";
import infoCardsRouter from "./info-cards.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/grammar-rules", grammarRulesRouter);
router.use("/questions", questionsRouter);
router.use("/quizzes", quizzesRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/notifications", notificationsRouter);
router.use("/analytics", analyticsRouter);
router.use("/info-cards", infoCardsRouter);

export default router;
