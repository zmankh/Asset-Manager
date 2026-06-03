import { useState } from "react";
import { useGetAnnualLeaderboard, useGetWeeklyLeaderboard, getGetAnnualLeaderboardQueryKey, getGetWeeklyLeaderboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Leaderboard() {
  const [period, setPeriod] = useState<"annual" | "weekly">("annual");
  const { data: annualData, isLoading: loadingAnnual } = useGetAnnualLeaderboard({ query: { enabled: period === "annual", queryKey: getGetAnnualLeaderboardQueryKey() } });
  const { data: weeklyData, isLoading: loadingWeekly } = useGetWeeklyLeaderboard({ query: { enabled: period === "weekly", queryKey: getGetWeeklyLeaderboardQueryKey() } });

  const data = period === "annual" ? annualData : weeklyData;
  const isLoading = period === "annual" ? loadingAnnual : loadingWeekly;

  const entries = data?.entries || [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="font-bold w-6 text-center">{rank}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">لوحة الشرف</h1>
        <p className="text-muted-foreground">تنافس مع زملائك واصعد إلى القمة</p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as "annual" | "weekly")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
          <TabsTrigger value="annual">السنوي</TabsTrigger>
          <TabsTrigger value="weekly">الأسبوعي</TabsTrigger>
        </TabsList>

        <TabsContent value={period}>
          {isLoading ? (
            <div className="text-center py-12">جاري التحميل...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">لا توجد بيانات متاحة حالياً</div>
          ) : (
            <div className="space-y-12">
              {/* Podium for Top 3 */}
              <div className="flex justify-center items-end gap-4 h-64 mt-12 mb-8">
                {/* 2nd Place */}
                {top3[1] && (
                  <div className="flex flex-col items-center w-1/3 max-w-[150px]">
                    <Avatar className="w-16 h-16 border-4 border-gray-200 -mb-8 z-10 bg-background">
                      <AvatarImage src={top3[1].photoURL || ""} />
                      <AvatarFallback>{top3[1].displayName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="w-full bg-gray-200 h-32 rounded-t-lg flex flex-col items-center justify-start pt-10 text-gray-800">
                      <span className="font-bold truncate w-full text-center px-2">{top3[1].displayName}</span>
                      <span className="text-sm">{top3[1].xp} نقطة</span>
                    </div>
                  </div>
                )}
                
                {/* 1st Place */}
                {top3[0] && (
                  <div className="flex flex-col items-center w-1/3 max-w-[160px]">
                    <Trophy className="w-10 h-10 text-yellow-500 mb-2" />
                    <Avatar className="w-20 h-20 border-4 border-yellow-400 -mb-10 z-10 bg-background">
                      <AvatarImage src={top3[0].photoURL || ""} />
                      <AvatarFallback>{top3[0].displayName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="w-full bg-yellow-100 h-40 rounded-t-lg flex flex-col items-center justify-start pt-12 text-yellow-900 border-t-4 border-yellow-400">
                      <span className="font-bold truncate w-full text-center px-2 text-lg">{top3[0].displayName}</span>
                      <span className="font-medium">{top3[0].xp} نقطة</span>
                      {top3[0].title && <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full mt-1">{top3[0].title}</span>}
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div className="flex flex-col items-center w-1/3 max-w-[150px]">
                    <Avatar className="w-16 h-16 border-4 border-amber-600 -mb-8 z-10 bg-background">
                      <AvatarImage src={top3[2].photoURL || ""} />
                      <AvatarFallback>{top3[2].displayName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="w-full bg-amber-100/50 h-24 rounded-t-lg flex flex-col items-center justify-start pt-10 text-amber-900 border-t-2 border-amber-600">
                      <span className="font-bold truncate w-full text-center px-2">{top3[2].displayName}</span>
                      <span className="text-sm">{top3[2].xp} نقطة</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Rest of the list */}
              <div className="space-y-3">
                {rest.map((entry) => (
                  <Card key={entry.userId} className="overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-8 flex justify-center text-muted-foreground">
                        {getRankIcon(entry.rank)}
                      </div>
                      <Avatar>
                        <AvatarImage src={entry.photoURL || ""} />
                        <AvatarFallback>{entry.displayName.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          {entry.displayName}
                          {entry.title && (
                            <span className="text-xs bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                              {entry.title}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-left font-mono font-bold text-primary">
                        {entry.xp} <span className="text-xs font-normal text-muted-foreground">XP</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
