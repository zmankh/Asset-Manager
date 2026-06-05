import { useState, useCallback } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  XCircle,
  Trophy,
  BookOpen,
  Zap,
  Star,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function fetchLevelProgress(userId: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_BASE}/users/${userId}/level-progress`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

type RuleProgress = {
  ruleId: string;
  ruleTitle: string;
  attempted: boolean;
  passed: boolean;
  bestScore: number | null;
  attempts: number;
  lastAttempt: string | null;
};

type LevelProgress = {
  levelId: string;
  levelTitle: string;
  levelOrder: number;
  categories: string[];
  active: boolean;
  rulesTotal: number;
  rulesPassed: number;
  percent: number;
  levelPassed: boolean;
  lastAttempt: string | null;
  rules: RuleProgress[];
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusIcon({ passed, attempted }: { passed: boolean; attempted: boolean }) {
  if (passed) return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (attempted) return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
  return <Circle className="w-4 h-4 text-muted-foreground shrink-0" />;
}

function LevelCard({ level }: { level: LevelProgress }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = level.levelPassed
    ? "border-green-200 bg-green-50/40"
    : level.rulesPassed > 0
    ? "border-yellow-200 bg-yellow-50/30"
    : "border-border bg-background";

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${statusColor}`}>
      {/* Level header row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {level.levelOrder}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm truncate">{level.levelTitle}</span>
            {level.levelPassed && (
              <Badge className="bg-green-500 hover:bg-green-600 text-xs">مكتمل</Badge>
            )}
            {!level.active && (
              <Badge variant="outline" className="text-xs">غير نشط</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Progress value={level.percent} className="h-2 flex-1" />
            <span className="text-xs font-medium text-muted-foreground shrink-0 w-16 text-left">
              {level.rulesPassed}/{level.rulesTotal} قاعدة
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground shrink-0 text-left">
          <div className="font-bold text-sm text-foreground">{level.percent}%</div>
          {level.lastAttempt && (
            <div className="mt-0.5">{formatDate(level.lastAttempt)}</div>
          )}
        </div>

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Expanded rule details */}
      {expanded && (
        <div className="border-t divide-y">
          {level.rules.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">لا توجد قواعد في هذا المستوى</p>
          ) : (
            level.rules.map((rule) => (
              <div key={rule.ruleId} className="flex items-center gap-3 px-6 py-3 text-sm">
                <StatusIcon passed={rule.passed} attempted={rule.attempted} />
                <span className="flex-1">{rule.ruleTitle}</span>
                {rule.attempted ? (
                  <>
                    <span className="text-muted-foreground text-xs">
                      {rule.attempts} {rule.attempts === 1 ? "محاولة" : "محاولات"}
                    </span>
                    <span className={`font-bold text-xs w-12 text-center ${rule.passed ? "text-green-600" : "text-red-500"}`}>
                      {rule.bestScore}%
                    </span>
                    {rule.lastAttempt && (
                      <span className="text-muted-foreground text-xs hidden sm:block w-24 text-left">
                        {formatDate(rule.lastAttempt)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">لم يُحاول بعد</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminStudentProgress() {
  const { data: users, isLoading: loadingUsers } = useListUsers();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const students = (users || []).filter((u: any) => u.role !== "admin");
  const filtered = students.filter((u: any) =>
    (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.schoolName || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = students.find((u: any) => u.id === selectedUserId) as any;

  const { data: levelProgress, isLoading: loadingProgress } = useQuery<LevelProgress[]>({
    queryKey: ["level-progress", selectedUserId],
    queryFn: () => fetchLevelProgress(selectedUserId!),
    enabled: !!selectedUserId,
  });

  // Summary stats for selected student
  const totalLevels = levelProgress?.length ?? 0;
  const completedLevels = levelProgress?.filter((l) => l.levelPassed).length ?? 0;
  const totalRules = levelProgress?.reduce((s, l) => s + l.rulesTotal, 0) ?? 0;
  const passedRules = levelProgress?.reduce((s, l) => s + l.rulesPassed, 0) ?? 0;
  const overallPercent = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">تقدم الطلاب</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Student List ─────────────────────────────────── */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">قائمة الطلاب</CardTitle>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم أو بريد أو مدرسة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto divide-y">
              {loadingUsers ? (
                <p className="text-center py-8 text-sm text-muted-foreground">جاري التحميل...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">لا يوجد طلاب</p>
              ) : (
                filtered.map((student: any) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedUserId(student.id)}
                    className={`w-full text-right px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors ${selectedUserId === student.id ? "bg-primary/10 border-r-2 border-primary" : ""}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {(student.displayName?.[0] || student.email?.[0] || "؟").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {student.displayName || student.email?.split("@")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      {student.schoolName && (
                        <p className="text-xs text-muted-foreground truncate">{student.schoolName}</p>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold text-secondary">{student.xpAnnual ?? 0} XP</p>
                      <p className="text-xs text-muted-foreground">🔥 {student.streak ?? 0}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Progress Detail ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedUser ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground space-y-2">
                <User className="w-10 h-10 mx-auto opacity-30" />
                <p className="font-medium">اختر طالباً من القائمة</p>
                <p className="text-sm">ستظهر هنا تفاصيل تقدمه في المستويات</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Student header */}
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center text-white text-lg font-bold shrink-0">
                      {(selectedUser.displayName?.[0] || selectedUser.email?.[0] || "؟").toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">
                        {selectedUser.displayName || selectedUser.email?.split("@")[0]}
                      </h2>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                      {selectedUser.schoolName && (
                        <p className="text-sm text-muted-foreground">{selectedUser.schoolName} — {selectedUser.district}</p>
                      )}
                    </div>

                    {/* Quick stats */}
                    <div className="flex gap-3 flex-wrap">
                      <div className="bg-secondary/10 px-4 py-2 rounded-xl text-center">
                        <Zap className="w-4 h-4 text-secondary mx-auto mb-1" />
                        <p className="text-lg font-black text-secondary">{selectedUser.xpAnnual ?? 0}</p>
                        <p className="text-xs text-muted-foreground">XP</p>
                      </div>
                      <div className="bg-orange-50 px-4 py-2 rounded-xl text-center">
                        <p className="text-lg font-black text-orange-500">🔥 {selectedUser.streak ?? 0}</p>
                        <p className="text-xs text-muted-foreground">تسلسل</p>
                      </div>
                      {!loadingProgress && (
                        <>
                          <div className="bg-green-50 px-4 py-2 rounded-xl text-center">
                            <Trophy className="w-4 h-4 text-green-500 mx-auto mb-1" />
                            <p className="text-lg font-black text-green-600">{completedLevels}/{totalLevels}</p>
                            <p className="text-xs text-muted-foreground">مستوى مكتمل</p>
                          </div>
                          <div className="bg-blue-50 px-4 py-2 rounded-xl text-center">
                            <BookOpen className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                            <p className="text-lg font-black text-blue-600">{passedRules}/{totalRules}</p>
                            <p className="text-xs text-muted-foreground">قاعدة مجتازة</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Overall progress bar */}
                  {!loadingProgress && totalRules > 0 && (
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">التقدم الكلي</span>
                        <span className="font-bold">{overallPercent}%</span>
                      </div>
                      <Progress value={overallPercent} className="h-3" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Level progress list */}
              {loadingProgress ? (
                <div className="text-center py-12 text-muted-foreground">جاري تحميل التقدم...</div>
              ) : !levelProgress || levelProgress.length === 0 ? (
                <Card className="text-center py-12">
                  <Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground">لم يبدأ هذا الطالب أي مستوى بعد</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground font-medium px-1">
                    انقر على المستوى لعرض تفاصيل القواعد
                  </p>
                  {levelProgress.map((level) => (
                    <LevelCard key={level.levelId} level={level} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
