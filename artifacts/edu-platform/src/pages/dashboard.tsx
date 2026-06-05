import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  useGetUser, 
  useListNotifications, 
  useGetLevel, 
  useListLevels, 
  useGetAnnualLeaderboard, 
  useGetWeeklyLeaderboard, 
  useGetUserBadges, 
  useListInfoCards,
  getGetUserQueryKey,
  getGetUserBadgesQueryKey,
  getListLevelsQueryKey,
  getGetLevelQueryKey,
  getGetAnnualLeaderboardQueryKey,
  getGetWeeklyLeaderboardQueryKey,
} from "@workspace/api-client-react";
import type { GradeCategory } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trophy, Flame, PlayCircle, Info, AlertTriangle, CheckCircle, Bell, Medal, ChevronLeft, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function StudentDashboard() {
  const { user } = useAuth();
  
  // User data
  const { data: userData, isLoading: isUserLoading, isError: isUserError } = useGetUser(user?.uid || "", {
    query: {
      enabled: !!user?.uid,
      queryKey: getGetUserQueryKey(user?.uid || ""),
      retry: 1,
    }
  });

  // Notifications
  const { data: notifications } = useListNotifications();
  const activeNotifications = notifications?.filter(n => n.active) || [];

  // Badges
  const { data: badges } = useGetUserBadges(user?.uid || "", {
    query: { enabled: !!user?.uid, queryKey: getGetUserBadgesQueryKey(user?.uid || "") }
  });
  const latestBadges = useMemo(() => badges?.slice(0, 4) || [], [badges]);

  // Info cards
  const { data: infoCards } = useListInfoCards();
  const activeInfoCards = useMemo(() => infoCards?.filter(c => c.active).sort((a, b) => (a.order||0) - (b.order||0)) || [], [infoCards]);

  // Current level logic
  const gradeCategory = (userData?.gradeCategory || null) as GradeCategory | null;
  const { data: levels } = useListLevels(undefined, {
    query: {
      enabled: !userData?.currentLevelId && !!gradeCategory,
      queryKey: getListLevelsQueryKey(),
    }
  });
  
  const currentLevelIdToFetch = userData?.currentLevelId ||
    (gradeCategory
      ? levels?.filter(l => l.active && l.categories.includes(gradeCategory)).sort((a, b) => a.order - b.order)[0]?.id
      : undefined);

  const { data: currentLevel, isLoading: isLevelLoading } = useGetLevel(currentLevelIdToFetch || "", {
    query: { enabled: !!currentLevelIdToFetch, queryKey: getGetLevelQueryKey(currentLevelIdToFetch || "") }
  });

  // Leaderboards
  const { data: annualLeaderboard } = useGetAnnualLeaderboard({
    query: { queryKey: getGetAnnualLeaderboardQueryKey() }
  });
  const { data: weeklyLeaderboard } = useGetWeeklyLeaderboard({
    query: { queryKey: getGetWeeklyLeaderboardQueryKey() }
  });

  const getNotificationIcon = (type?: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'announcement': return <Bell className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const currentXP = userData?.xpAnnual || 0;

  if (isUserLoading && !isUserError) {
    return <div className="flex h-64 items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">أهلاً بك، {userData?.displayName || user?.email}</h1>
          <p className="text-muted-foreground mt-2">استمر في التعلم وحقق أهدافك النحوية</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800 min-w-[100px]">
            <Trophy className="h-6 w-6 text-yellow-500 mb-1" />
            <span className="text-sm text-muted-foreground">خبرة سنوية</span>
            <span className="font-bold text-lg">{currentXP}</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800 min-w-[100px]">
            <Flame className="h-6 w-6 text-orange-500 mb-1" />
            <span className="text-sm text-muted-foreground">استمرارية</span>
            <span className="font-bold text-lg">{userData?.streak || 0} أيام</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {activeNotifications.length > 0 && (
        <div className="space-y-3">
          {activeNotifications.map(notification => (
            <Alert key={notification.id} variant={notification.type === 'warning' ? 'destructive' : 'default'} className="bg-primary/5 border-primary/20">
              {getNotificationIcon(notification.type)}
              <AlertTitle className="mr-2 font-bold">{notification.title}</AlertTitle>
              <AlertDescription className="mr-2 mt-1">
                {notification.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Current Level Card */}
          <Card className="border-2 border-primary/20 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                المستوى الحالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLevelLoading ? (
                <div className="h-20 flex items-center justify-center text-muted-foreground">جاري تحميل المستوى...</div>
              ) : currentLevel ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary">{currentLevel.title}</h3>
                    {currentLevel.ruleTitle && (
                      <p className="text-muted-foreground mt-1 text-sm flex items-center gap-1.5">
                        <Badge variant="secondary" className="bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground">القاعدة: {currentLevel.ruleTitle}</Badge>
                      </p>
                    )}
                  </div>
                  <div className="pt-2">
                    <Link href={`/exam/${currentLevel.id}`} className="inline-block w-full sm:w-auto">
                      <Button size="lg" className="w-full sm:w-auto gap-2 group text-base px-8">
                        <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        بدء الامتحان
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground py-4">لم يتم تعيين مستوى بعد. يرجى مراجعة الإدارة.</div>
              )}
            </CardContent>
          </Card>

          {/* Badges Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">أحدث أوسمتي</CardTitle>
              <Link href="/badges" className="text-sm text-primary hover:underline flex items-center gap-1">
                عرض كل الأوسمة <ChevronLeft className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {latestBadges.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {latestBadges.map((badge, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-muted text-center gap-2 hover:bg-muted/50 transition-colors">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                        <Medal className="w-6 h-6 text-yellow-500" />
                      </div>
                      <span className="text-xs font-medium line-clamp-2" title={badge.ruleTitle}>{badge.ruleTitle}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  <Medal className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p>لم تحصل على أي وسام بعد.</p>
                  <p className="text-sm mt-1">اجتز الامتحانات لجمع الأوسمة!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Area */}
        <div className="space-y-6">
          {/* Mini Leaderboard */}
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> لوحة الشرف
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="annual" className="w-full">
                <div className="px-6">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="annual">سنوي</TabsTrigger>
                    <TabsTrigger value="weekly">أسبوعي</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="annual" className="mt-0">
                  <div className="divide-y">
                    {annualLeaderboard?.entries?.slice(0, 5).map((entry, index) => (
                      <div key={entry.userId} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-slate-100 text-slate-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {entry.rank}
                          </span>
                          <span className="font-medium truncate max-w-[120px]">{entry.displayName}</span>
                        </div>
                        <span className="font-bold text-primary text-sm">{entry.xp}</span>
                      </div>
                    ))}
                    {(!annualLeaderboard?.entries || annualLeaderboard.entries.length === 0) && (
                      <div className="px-6 py-8 text-center text-sm text-muted-foreground">لا توجد بيانات متاحة</div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="weekly" className="mt-0">
                  <div className="divide-y">
                    {weeklyLeaderboard?.entries?.slice(0, 5).map((entry, index) => (
                      <div key={entry.userId} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-slate-100 text-slate-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {entry.rank}
                          </span>
                          <span className="font-medium truncate max-w-[120px]">{entry.displayName}</span>
                        </div>
                        <span className="font-bold text-primary text-sm">{entry.xp}</span>
                      </div>
                    ))}
                    {(!weeklyLeaderboard?.entries || weeklyLeaderboard.entries.length === 0) && (
                      <div className="px-6 py-8 text-center text-sm text-muted-foreground">لا توجد بيانات متاحة</div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              <div className="px-6 py-4 mt-2 bg-muted/10 border-t">
                <Link href="/leaderboard" className="text-sm font-medium text-center block w-full text-primary hover:underline">
                  عرض القائمة الكاملة
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
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

      {/* Bottom Action */}
      <div className="flex justify-center pt-4 border-t border-border/50">
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
