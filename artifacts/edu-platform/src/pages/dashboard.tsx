import { useMemo, useCallback, Fragment } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  useGetUser, 
  useListNotifications, 
  useListLevels, 
  useGetAnnualLeaderboard, 
  useGetWeeklyLeaderboard, 
  useGetUserBadges, 
  useListInfoCards,
  getGetUserQueryKey,
  getGetUserBadgesQueryKey,
  getListLevelsQueryKey,
  getGetAnnualLeaderboardQueryKey,
  getGetWeeklyLeaderboardQueryKey,
} from "@workspace/api-client-react";
import type { GradeCategory } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Trophy, Flame, PlayCircle, Info, AlertTriangle, CheckCircle,
  Bell, Medal, ChevronLeft, ArrowLeft, Lock, Star, Zap,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Journey Map ────────────────────────────────────────────────────────────────

function LevelNode({
  level, isPassed, isCurrent, isLocked, hasPerfectScore,
}: {
  level: any; isPassed: boolean; isCurrent: boolean; isLocked: boolean; hasPerfectScore: boolean;
}) {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => !isLocked && navigate(`/exam/${level.id}`)}
        disabled={isLocked}
        title={isLocked ? "مقفل" : level.title}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-md
          ${isPassed && hasPerfectScore ? "bg-yellow-400 text-white shadow-yellow-200 hover:scale-105" : ""}
          ${isPassed && !hasPerfectScore ? "bg-green-500 text-white shadow-green-200 hover:scale-105" : ""}
          ${isCurrent ? "bg-primary text-primary-foreground shadow-primary/40 scale-110 hover:scale-115" : ""}
          ${isLocked ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none" : ""}
        `}
      >
        {/* Pulsing ring for current */}
        {isCurrent && (
          <span className="absolute -inset-1.5 rounded-full border-2 border-primary/50 animate-ping" />
        )}

        {isPassed && hasPerfectScore && <Medal className="w-6 h-6" />}
        {isPassed && !hasPerfectScore && <CheckCircle className="w-6 h-6" />}
        {isCurrent && <PlayCircle className="w-6 h-6" />}
        {isLocked && <Lock className="w-5 h-5" />}
      </button>

      <div className="text-center max-w-[84px]">
        <p className={`text-xs font-semibold leading-tight line-clamp-2
          ${isLocked ? "text-muted-foreground" : isCurrent ? "text-primary" : hasPerfectScore ? "text-yellow-600" : "text-foreground"}
        `}>
          {level.title}
        </p>
        {hasPerfectScore && isPassed && (
          <p className="text-xs text-yellow-500 font-bold mt-0.5">100% ⭐</p>
        )}
        {(level as any).rules?.length > 0 && !hasPerfectScore && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {(level as any).rules.length} {(level as any).rules.length === 1 ? "قاعدة" : "قواعد"}
          </p>
        )}
      </div>

      {isCurrent && (
        <Button size="sm" className="text-xs h-7 px-3 shadow-sm" onClick={() => navigate(`/exam/${level.id}`)}>
          ابدأ
        </Button>
      )}
    </div>
  );
}

function JourneyMap({
  levels, currentLevelId, badges,
}: {
  levels: any[]; currentLevelId: string | null; badges: any[];
}) {
  const currentLevel = levels.find(l => l.id === currentLevelId);
  const currentOrder = currentLevel?.order ?? 1;
  const passedCount = levels.filter(l => l.order < currentOrder).length;
  const masteryPercent = levels.length > 0 ? Math.round((passedCount / levels.length) * 100) : 0;

  // Build a Set of ruleIds that have a perfect-score badge
  const perfectRuleIds = useMemo(() => new Set(badges.map(b => b.ruleId)), [badges]);

  // A level has a perfect score if ALL its rules have a badge
  const levelHasPerfect = useCallback(
    (level: any): boolean => {
      const rules: any[] = level.rules || [];
      return rules.length > 0 && rules.every((r: any) => perfectRuleIds.has(r.id));
    },
    [perfectRuleIds]
  );

  return (
    <div className="space-y-4">
      {/* Global Mastery Bar */}
      <div className="bg-gradient-to-l from-primary/5 to-primary/15 border border-primary/15 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">مسيرة الإتقان</span>
          </div>
          <span className="text-sm font-black text-primary">{masteryPercent}%</span>
        </div>
        <Progress value={masteryPercent} className="h-3" />
        <p className="text-xs text-muted-foreground mt-1.5">
          أتقنت {passedCount} من {levels.length} مستوى
          {badges.length > 0 && ` · ${badges.length} وسام مكتسب 🏅`}
        </p>
      </div>

      {/* Journey path */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            خريطة رحلتك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <div className="flex items-start gap-0 min-w-max py-2">
              {levels.map((level, idx) => {
                const isPassed = level.order < currentOrder;
                const isCurrent = level.id === currentLevelId;
                const isLocked = !isPassed && !isCurrent;
                const hasPerfect = isPassed && levelHasPerfect(level);
                return (
                  <Fragment key={level.id}>
                    {idx > 0 && (
                      <div className={`h-0.5 w-10 self-center mb-12 transition-colors
                        ${isPassed && levelHasPerfect(level) ? "bg-yellow-400" : isPassed ? "bg-green-400" : "bg-muted"}
                      `} />
                    )}
                    <LevelNode
                      level={level}
                      isPassed={isPassed}
                      isCurrent={isCurrent}
                      isLocked={isLocked}
                      hasPerfectScore={hasPerfect}
                    />
                  </Fragment>
                );
              })}
              {levels.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 px-2">لا توجد مستويات متاحة لفئتك الدراسية بعد.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: userData, isLoading: isUserLoading, isError: isUserError } = useGetUser(user?.uid || "", {
    query: { enabled: !!user?.uid, queryKey: getGetUserQueryKey(user?.uid || ""), retry: 1 }
  });

  const { data: notifications } = useListNotifications();
  const activeNotifications = notifications?.filter(n => n.active) || [];

  const { data: badges } = useGetUserBadges(user?.uid || "", {
    query: { enabled: !!user?.uid, queryKey: getGetUserBadgesQueryKey(user?.uid || "") }
  });
  const allBadges = badges || [];
  const latestBadges = useMemo(() => allBadges.slice(0, 4), [allBadges]);

  const { data: infoCards } = useListInfoCards();
  const activeInfoCards = useMemo(
    () => infoCards?.filter(c => c.active).sort((a, b) => (a.order || 0) - (b.order || 0)) || [],
    [infoCards]
  );

  const gradeCategory = (userData?.gradeCategory || null) as GradeCategory | null;

  const { data: allLevels } = useListLevels(
    gradeCategory ? { category: gradeCategory } : undefined,
    { query: { enabled: !!gradeCategory, queryKey: getListLevelsQueryKey() } }
  );

  const sortedLevels = useMemo(
    () => [...(allLevels || [])].filter(l => l.active).sort((a, b) => a.order - b.order),
    [allLevels]
  );

  const currentLevelId = useMemo(() => {
    if (userData?.currentLevelId) return userData.currentLevelId as string;
    return sortedLevels[0]?.id ?? null;
  }, [userData?.currentLevelId, sortedLevels]);

  const { data: annualLeaderboard } = useGetAnnualLeaderboard({ query: { queryKey: getGetAnnualLeaderboardQueryKey() } });
  const { data: weeklyLeaderboard } = useGetWeeklyLeaderboard({ query: { queryKey: getGetWeeklyLeaderboardQueryKey() } });

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "success": return <CheckCircle className="h-4 w-4" />;
      case "announcement": return <Bell className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (isUserLoading && !isUserError) {
    return (
      <div className="space-y-6 pb-10 max-w-5xl mx-auto animate-pulse">
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="h-52 bg-muted rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-40 bg-muted rounded-2xl" />
          <div className="h-40 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            أهلاً بك، {userData?.displayName || user?.email}
          </h1>
          <p className="text-muted-foreground mt-1">استمر في التعلم وحقق أهدافك النحوية</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border min-w-[90px]">
            <Trophy className="h-5 w-5 text-yellow-500 mb-1" />
            <span className="text-xs text-muted-foreground">خبرة سنوية</span>
            <span className="font-black text-lg">{userData?.xpAnnual || 0}</span>
          </div>
          <div className="flex flex-col items-center bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border min-w-[90px]">
            <Flame className="h-5 w-5 text-orange-500 mb-1" />
            <span className="text-xs text-muted-foreground">استمرارية</span>
            <span className="font-black text-lg">{userData?.streak || 0}</span>
          </div>
        </div>
      </div>

      {/* Active notifications */}
      {activeNotifications.length > 0 && (
        <div className="space-y-3">
          {activeNotifications.map(notification => (
            <Alert
              key={notification.id}
              variant={notification.type === "warning" ? "destructive" : "default"}
              className="bg-primary/5 border-primary/20"
            >
              {getNotificationIcon(notification.type)}
              <AlertTitle className="mr-2 font-bold">{notification.title}</AlertTitle>
              <AlertDescription className="mr-2 mt-1">{notification.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Journey Map */}
      {gradeCategory ? (
        <JourneyMap levels={sortedLevels} currentLevelId={currentLevelId} badges={allBadges} />
      ) : (
        <Card className="text-center py-10 border-dashed">
          <CardContent>
            <p className="text-muted-foreground">لم يتم تعيين فئة دراسية. يرجى مراجعة الإدارة.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Badges */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xl">أحدث أوسمتي</CardTitle>
              <Link href="/badges" className="text-sm text-primary hover:underline flex items-center gap-1">
                عرض كل الأوسمة <ChevronLeft className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {latestBadges.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {latestBadges.map((badge, idx) => (
                    <div key={idx} className="flex flex-col items-center p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 text-center gap-2 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                        <Medal className="w-6 h-6 text-yellow-500" />
                      </div>
                      <span className="text-xs font-medium line-clamp-2" title={badge.ruleTitle}>
                        {badge.ruleTitle}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  <Medal className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p>لم تحصل على أي وسام بعد.</p>
                  <p className="text-sm mt-1">اجتز الامتحانات بدرجة 100% لجمع الأوسمة!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mini Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> لوحة الشرف
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="annual" className="w-full">
              <div className="px-4">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="annual">سنوي</TabsTrigger>
                  <TabsTrigger value="weekly">أسبوعي</TabsTrigger>
                </TabsList>
              </div>
              {["annual", "weekly"].map(tab => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  <div className="divide-y">
                    {(tab === "annual" ? annualLeaderboard : weeklyLeaderboard)?.entries?.slice(0, 5).map((entry, index) => (
                      <div key={entry.userId} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? "bg-yellow-100 text-yellow-700" :
                            index === 1 ? "bg-slate-100 text-slate-700" :
                            index === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-muted text-muted-foreground"
                          }`}>{entry.rank}</span>
                          <span className="font-medium text-sm truncate max-w-[100px]">{entry.displayName}</span>
                        </div>
                        <span className="font-bold text-primary text-sm">{entry.xp}</span>
                      </div>
                    ))}
                    {!((tab === "annual" ? annualLeaderboard : weeklyLeaderboard)?.entries?.length) && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            <div className="px-4 py-3 border-t">
              <Link href="/leaderboard" className="text-sm font-medium text-center block w-full text-primary hover:underline">
                القائمة الكاملة
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      {activeInfoCards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeInfoCards.map(card => (
            <Card key={card.id} className="bg-primary/5 border-primary/20 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Practice CTA */}
      <div className="flex justify-center pt-2 border-t border-border/50">
        <Link href="/quiz">
          <Button variant="outline" size="lg" className="gap-2 min-w-[200px] border-primary/30 hover:bg-primary/5 text-primary">
            تدرّب الآن
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
