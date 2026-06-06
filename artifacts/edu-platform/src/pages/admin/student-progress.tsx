import { useState, useCallback } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Search, ChevronDown, ChevronUp, CheckCircle2, Circle, XCircle,
  Trophy, BookOpen, Zap, Star, User, Download, FileSpreadsheet, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

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
  ruleId: string; ruleTitle: string;
  attempted: boolean; passed: boolean;
  bestScore: number | null; attempts: number; lastAttempt: string | null;
};

type LevelProgress = {
  levelId: string; levelTitle: string; levelOrder: number;
  categories: string[]; active: boolean;
  rulesTotal: number; rulesPassed: number; percent: number;
  levelPassed: boolean; lastAttempt: string | null; rules: RuleProgress[];
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
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
    : level.rulesPassed > 0 ? "border-yellow-200 bg-yellow-50/30"
    : "border-border bg-background";

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${statusColor}`}>
      <div className="flex items-center gap-4 p-4 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {level.levelOrder}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm truncate">{level.levelTitle}</span>
            {level.levelPassed && <Badge className="bg-green-500 hover:bg-green-600 text-xs">مكتمل</Badge>}
            {!level.active && <Badge variant="outline" className="text-xs">غير نشط</Badge>}
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
          {level.lastAttempt && <div className="mt-0.5">{formatDate(level.lastAttempt)}</div>}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="border-t divide-y">
          {level.rules.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">لا توجد قواعد في هذا المستوى</p>
          ) : (
            level.rules.map(rule => (
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

// ── Export helpers ────────────────────────────────────────────────────────────

function exportStudentExcel(student: any, levelProgress: LevelProgress[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ["اسم الطالب", student.displayName || student.email],
    ["البريد الإلكتروني", student.email],
    ["المدرسة", student.schoolName || "-"],
    ["المنطقة", student.district || "-"],
    ["XP السنوي", student.xpAnnual || 0],
    ["الاستمرارية", student.streak || 0],
    [],
    ["إجمالي المستويات", levelProgress.length],
    ["المستويات المكتملة", levelProgress.filter(l => l.levelPassed).length],
    ["إجمالي القواعد", levelProgress.reduce((s, l) => s + l.rulesTotal, 0)],
    ["القواعد المجتازة", levelProgress.reduce((s, l) => s + l.rulesPassed, 0)],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 24 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص الطالب");

  // Sheet 2: Detailed per-rule progress
  const detailHeader = ["المستوى", "رقم المستوى", "حالة المستوى", "القاعدة", "الحالة", "أفضل نتيجة", "عدد المحاولات", "آخر محاولة"];
  const detailRows: any[][] = [detailHeader];
  for (const level of levelProgress) {
    if (level.rules.length === 0) {
      detailRows.push([level.levelTitle, level.levelOrder, level.levelPassed ? "مكتمل" : "غير مكتمل", "-", "-", "-", "-", "-"]);
    } else {
      for (const rule of level.rules) {
        detailRows.push([
          level.levelTitle, level.levelOrder,
          level.levelPassed ? "مكتمل" : "غير مكتمل",
          rule.ruleTitle,
          rule.passed ? "اجتاز" : rule.attempted ? "لم يجتز" : "لم يحاول",
          rule.bestScore !== null ? `${rule.bestScore}%` : "-",
          rule.attempts,
          formatDate(rule.lastAttempt),
        ]);
      }
    }
  }
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, "تفاصيل القواعد");

  const name = (student.displayName || student.email?.split("@")[0] || "طالب").replace(/\s+/g, "_");
  XLSX.writeFile(wb, `تقرير_${name}.xlsx`);
}

function exportAllStudentsExcel(students: any[]) {
  const wb = XLSX.utils.book_new();
  const header = ["الاسم", "البريد", "المدرسة", "المنطقة", "XP السنوي", "الاستمرارية", "الفئة الدراسية"];
  const rows = [header, ...students.map(s => [
    s.displayName || "-", s.email || "-", s.schoolName || "-",
    s.district || "-", s.xpAnnual || 0, s.streak || 0, s.gradeCategory || "-",
  ])];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 24 }, { wch: 32 }, { wch: 24 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "بيانات الطلاب");
  XLSX.writeFile(wb, "تقرير_جميع_الطلاب.xlsx");
}

function printStudentReport(student: any, levelProgress: LevelProgress[]) {
  const passedRules = levelProgress.reduce((s, l) => s + l.rulesPassed, 0);
  const totalRules = levelProgress.reduce((s, l) => s + l.rulesTotal, 0);
  const completedLevels = levelProgress.filter(l => l.levelPassed).length;

  const html = `
    <html dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>تقرير الطالب - ${student.displayName || student.email}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #1a1a1a; direction: rtl; }
        h1 { color: #7c3aed; font-size: 24px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        .stats { display: flex; gap: 16px; margin-bottom: 24px; }
        .stat { background: #f3f0ff; border-radius: 12px; padding: 12px 20px; text-align: center; }
        .stat-val { font-size: 22px; font-weight: 900; color: #7c3aed; }
        .stat-lbl { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #7c3aed; color: white; padding: 8px 12px; text-align: right; }
        td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #fafafa; }
        .pass { color: #16a34a; font-weight: bold; }
        .fail { color: #dc2626; }
        .none { color: #9ca3af; }
        @media print { body { margin: 16px; } }
      </style>
    </head>
    <body>
      <h1>تقرير تقدم الطالب</h1>
      <div class="meta">
        ${student.displayName || ""} — ${student.email} ${student.schoolName ? `— ${student.schoolName}` : ""}<br/>
        تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA")}
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${student.xpAnnual || 0}</div><div class="stat-lbl">XP سنوي</div></div>
        <div class="stat"><div class="stat-val">${completedLevels}/${levelProgress.length}</div><div class="stat-lbl">مستويات مكتملة</div></div>
        <div class="stat"><div class="stat-val">${passedRules}/${totalRules}</div><div class="stat-lbl">قواعد مجتازة</div></div>
        <div class="stat"><div class="stat-val">${totalRules > 0 ? Math.round(passedRules / totalRules * 100) : 0}%</div><div class="stat-lbl">نسبة الإتقان</div></div>
      </div>
      <table>
        <thead><tr><th>المستوى</th><th>القاعدة</th><th>الحالة</th><th>أفضل نتيجة</th><th>المحاولات</th><th>آخر محاولة</th></tr></thead>
        <tbody>
          ${levelProgress.flatMap(level =>
            level.rules.length === 0
              ? [`<tr><td>${level.levelTitle}</td><td colspan="5" class="none">لا توجد قواعد</td></tr>`]
              : level.rules.map(rule => `
                <tr>
                  <td>${level.levelTitle}</td>
                  <td>${rule.ruleTitle}</td>
                  <td class="${rule.passed ? "pass" : rule.attempted ? "fail" : "none"}">
                    ${rule.passed ? "✓ اجتاز" : rule.attempted ? "✗ لم يجتز" : "لم يحاول"}
                  </td>
                  <td>${rule.bestScore !== null ? rule.bestScore + "%" : "-"}</td>
                  <td>${rule.attempts}</td>
                  <td>${formatDate(rule.lastAttempt)}</td>
                </tr>`)
          ).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

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

  const totalLevels = levelProgress?.length ?? 0;
  const completedLevels = levelProgress?.filter(l => l.levelPassed).length ?? 0;
  const totalRules = levelProgress?.reduce((s, l) => s + l.rulesTotal, 0) ?? 0;
  const passedRules = levelProgress?.reduce((s, l) => s + l.rulesPassed, 0) ?? 0;
  const overallPercent = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold tracking-tight">تقدم الطلاب</h1>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => exportAllStudentsExcel(students)}
          disabled={students.length === 0}
        >
          <FileSpreadsheet className="w-4 h-4" />
          تصدير جميع الطلاب (Excel)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Student List ─────────────────────────────────────────────── */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">قائمة الطلاب ({filtered.length})</CardTitle>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم أو بريد أو مدرسة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto divide-y">
              {loadingUsers ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))
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

        {/* ── Progress Detail ───────────────────────────────────────────── */}
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
              {/* Student header + export buttons */}
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-4 flex-wrap">
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

                    {/* Export buttons */}
                    {levelProgress && levelProgress.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => exportStudentExcel(selectedUser, levelProgress)}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Excel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => printStudentReport(selectedUser, levelProgress)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          PDF
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Quick stats */}
                  <div className="flex gap-3 flex-wrap mt-4">
                    <div className="bg-secondary/10 px-4 py-2 rounded-xl text-center">
                      <Zap className="w-4 h-4 text-secondary mx-auto mb-1" />
                      <p className="text-lg font-black text-secondary">{selectedUser.xpAnnual ?? 0}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/20 px-4 py-2 rounded-xl text-center">
                      <p className="text-lg font-black text-orange-500">🔥 {selectedUser.streak ?? 0}</p>
                      <p className="text-xs text-muted-foreground">تسلسل</p>
                    </div>
                    {!loadingProgress && (
                      <>
                        <div className="bg-green-50 dark:bg-green-950/20 px-4 py-2 rounded-xl text-center">
                          <Trophy className="w-4 h-4 text-green-500 mx-auto mb-1" />
                          <p className="text-lg font-black text-green-600">{completedLevels}/{totalLevels}</p>
                          <p className="text-xs text-muted-foreground">مستوى مكتمل</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/20 px-4 py-2 rounded-xl text-center">
                          <BookOpen className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                          <p className="text-lg font-black text-blue-600">{passedRules}/{totalRules}</p>
                          <p className="text-xs text-muted-foreground">قاعدة مجتازة</p>
                        </div>
                      </>
                    )}
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
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
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
                  {levelProgress.map(level => (
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
