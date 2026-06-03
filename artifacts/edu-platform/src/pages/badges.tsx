import { useAuth } from "@/lib/auth-context";
import { useGetUserBadges, getGetUserBadgesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Medal, Award, Trophy } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function Badges() {
  const { user } = useAuth();
  
  const { data: badges, isLoading } = useGetUserBadges(user?.uid || "", {
    query: {
      enabled: !!user?.uid,
      queryKey: getGetUserBadgesQueryKey(user?.uid || "")
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">أوسمتي</h1>
        <p className="text-muted-foreground mt-2">
          الأوسمة التي حصلت عليها نتيجة تفوقك وإنجازاتك
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse bg-muted/50 h-48 border-none" />
          ))}
        </div>
      ) : !badges || badges.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center bg-muted/30 border-dashed">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Trophy className="h-10 w-10 text-primary/40" />
          </div>
          <h2 className="text-2xl font-bold mb-2">لم تحصل على أي وسام بعد</h2>
          <p className="text-muted-foreground max-w-sm">
            استمر في التعلم واجتياز المستويات لجمع الأوسمة وإثبات مهارتك!
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {badges.map((badge) => (
            <Card key={badge.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full group-hover:bg-yellow-500/30 transition-colors" />
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center shadow-lg relative z-10">
                    <Medal className="h-10 w-10 text-white drop-shadow-md" />
                  </div>
                </div>
                
                <div className="space-y-1 w-full">
                  <h3 className="font-bold text-lg text-primary">{badge.ruleTitle}</h3>
                  {badge.levelTitle && (
                    <p className="text-sm font-medium text-muted-foreground">{badge.levelTitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                    {format(new Date(badge.earnedAt), "d MMMM yyyy", { locale: ar })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
