import { useAuth } from "@/lib/auth-context";
import { useGetUser, useListNotifications, useListInfoCards, getGetUserQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trophy, Flame, PlayCircle, Info, AlertTriangle, CheckCircle, Bell } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: userData } = useGetUser(user?.uid || "", {
    query: { enabled: !!user?.uid, queryKey: getGetUserQueryKey(user?.uid || "") }
  });
  const { data: notifications } = useListNotifications();
  const { data: infoCards } = useListInfoCards();

  const activeNotifications = notifications?.filter(n => n.active) || [];
  const activeInfoCards = infoCards?.filter(c => c.active).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  const getNotificationIcon = (type?: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'announcement': return <Bell className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const nextLevelXP = 1000;
  const currentXP = userData?.xpAnnual || 0;
  const progress = Math.min(100, Math.round((currentXP / nextLevelXP) * 100));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">أهلاً بك، {userData?.displayName || user?.email}</h1>
          <p className="text-muted-foreground mt-2">استمر في التعلم وحقق أهدافك النحوية</p>
        </div>
        <Link href="/quiz">
          <Button size="lg" className="gap-2">
            <PlayCircle className="w-5 h-5" />
            بدء اختبار جديد
          </Button>
        </Link>
      </div>

      {activeNotifications.length > 0 && (
        <div className="space-y-4">
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">مستوى التقدم</CardTitle>
            <Trophy className="w-5 h-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{currentXP} <span className="text-sm font-normal text-muted-foreground">نقطة خبرة</span></span>
              <span className="text-sm text-muted-foreground">الهدف: {nextLevelXP}</span>
            </div>
            <Progress value={progress} className="h-3" />
            {userData?.title && (
              <div className="mt-4 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary/10 text-secondary-foreground border-secondary/20">
                اللقب الحالي: {userData.title}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">الاستمرارية</CardTitle>
            <Flame className="w-5 h-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">{userData?.streak || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">أيام متتالية من التعلم</p>
          </CardContent>
        </Card>
      </div>

      {activeInfoCards.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">معلومات هامة</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeInfoCards.map(card => (
              <Card key={card.id} className="bg-muted/50 border-none shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
