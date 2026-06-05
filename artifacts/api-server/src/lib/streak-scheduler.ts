import { getFirestore } from "./firebase-admin.js";
import { logger } from "./logger.js";

export async function runStreakReminders(): Promise<{ sent: number; skipped: number }> {
  const db = getFirestore();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString(); // 22h ago
  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Get all students
  const usersSnap = await db.collection("users").where("role", "==", "student").get();

  let sent = 0;
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data() as any;
    const userId = userDoc.id;

    // Skip if active recently
    const lastActive = user.lastActiveAt as string | undefined;
    if (lastActive && lastActive >= cutoff) {
      skipped++;
      continue;
    }

    // Skip if already sent a streak reminder today
    const alreadySentSnap = await db
      .collection("userNotifications")
      .where("userId", "==", userId)
      .where("type", "==", "streak")
      .get();

    const alreadySentToday = alreadySentSnap.docs.some((d) => {
      const createdAt = (d.data() as any).createdAt as string;
      return createdAt?.startsWith(todayStr);
    });

    if (alreadySentToday) {
      skipped++;
      continue;
    }

    // Send reminder
    const streak = user.streak || 0;
    const title = streak > 0 ? `🔥 لا تكسر متتاليتك! (${streak} يوم)` : "📚 وقت التدريب!";
    const message =
      streak > 0
        ? `لديك متتالية ${streak} يوم — تدرّب اليوم لتحافظ عليها!`
        : "لم تتدرب اليوم بعد. ابدأ الآن وابنِ عادة يومية!";

    await db.collection("userNotifications").add({
      userId,
      title,
      message,
      type: "streak",
      read: false,
      createdAt: now.toISOString(),
    });

    sent++;
  }

  // Save last run info to settings
  await db.collection("siteSettings").doc("main").set(
    {
      streakReminderLastRun: now.toISOString(),
      streakReminderLastSentCount: sent,
    },
    { merge: true }
  );

  logger.info({ sent, skipped }, "Streak reminders sent");
  return { sent, skipped };
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startStreakScheduler() {
  if (schedulerInterval) return;

  // Run every hour
  schedulerInterval = setInterval(async () => {
    try {
      const db = getFirestore();
      const settingsDoc = await db.collection("siteSettings").doc("main").get();
      const settings = settingsDoc.data() as any;
      if (settings?.streakReminderEnabled) {
        await runStreakReminders();
      }
    } catch (err) {
      logger.error({ err }, "Streak scheduler error");
    }
  }, 60 * 60 * 1000); // every 1 hour

  logger.info("Streak reminder scheduler started (hourly check)");
}
