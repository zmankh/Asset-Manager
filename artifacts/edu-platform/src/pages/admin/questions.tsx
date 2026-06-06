import { useState, useRef, useCallback } from "react";
import { 
  useListQuestions, 
  useCreateQuestion, 
  useUpdateQuestion, 
  useDeleteQuestion, 
  useListGrammarRules,
  useBulkCreateQuestions,
  getListQuestionsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Trash2, Edit, Plus, Upload, Download, CheckSquare, Square, AlertCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type StagedQuestion = {
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
  hint: string;
  errors: string[];
};

function validateStaged(q: StagedQuestion): string[] {
  const errors: string[] = [];
  if (!q.questionText.trim()) errors.push("نص السؤال مطلوب");
  if (!q.option1.trim() || !q.option2.trim()) errors.push("خياران على الأقل مطلوبان");
  if (!q.correctAnswer.trim()) errors.push("الإجابة الصحيحة مطلوبة");
  const options = [q.option1, q.option2, q.option3, q.option4].filter(Boolean);
  if (q.correctAnswer && !options.includes(q.correctAnswer)) errors.push("الإجابة يجب أن تطابق أحد الخيارات");
  return errors;
}

export default function AdminQuestions() {
  const [selectedRuleId, setSelectedRuleId] = useState<string>("all");
  const { data: rules } = useListGrammarRules();
  const { data: questions, isLoading } = useListQuestions({ ruleId: selectedRuleId === "all" ? undefined : selectedRuleId });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Staging upload state ───────────────────────────────────────────────────
  const [stagingOpen, setStagingOpen] = useState(false);
  const [uploadRuleId, setUploadRuleId] = useState<string>("");
  const [stagedQuestions, setStagedQuestions] = useState<StagedQuestion[]>([]);
  const [stagingStep, setStagingStep] = useState<"select" | "preview">("select");
  const stagingFileRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    ruleId: "", questionText: "",
    option1: "", option2: "", option3: "", option4: "", 
    correctAnswer: "", hint: "" 
  });

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const bulkCreate = useBulkCreateQuestions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredQuestions = questions?.filter(q => 
    q.questionText.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredQuestions.length / PAGE_SIZE);
  const pagedQuestions = filteredQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Bulk select ────────────────────────────────────────────────────────────
  // Reset page on filter change
  const handleRuleChange = (v: string) => { setSelectedRuleId(v); setSelectedIds(new Set()); setPage(1); };
  const handleSearchChange = (v: string) => { setSearchTerm(v); setPage(1); };

  const allSelected = pagedQuestions.length > 0 && pagedQuestions.every(q => selectedIds.has(q.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedQuestions.map(q => q.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} سؤال؟`)) return;
    const ids = Array.from(selectedIds);
    let failed = 0;
    for (const id of ids) {
      try { await deleteQuestion.mutateAsync({ questionId: id }); }
      catch { failed++; }
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
    toast({ title: `تم حذف ${ids.length - failed} سؤال${failed > 0 ? `، فشل ${failed}` : ""}` });
  };

  // ── Single question CRUD ───────────────────────────────────────────────────
  const handleOpenEdit = (q: any) => {
    setEditingId(q.id);
    setFormData({ 
      ruleId: q.ruleId, questionText: q.questionText, 
      option1: q.options[0] || "", option2: q.options[1] || "", 
      option3: q.options[2] || "", option4: q.options[3] || "", 
      correctAnswer: q.correctAnswer, hint: q.hint || "" 
    });
    setIsOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ 
      ruleId: selectedRuleId !== "all" ? selectedRuleId : (rules?.[0]?.id || ""), 
      questionText: "", option1: "", option2: "", option3: "", option4: "", 
      correctAnswer: "", hint: "" 
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = [formData.option1, formData.option2, formData.option3, formData.option4].filter(Boolean);
    if (!options.includes(formData.correctAnswer)) {
      toast({ title: "الإجابة الصحيحة يجب أن تكون إحدى الخيارات", variant: "destructive" });
      return;
    }
    const payload = { ruleId: formData.ruleId, questionText: formData.questionText, options, correctAnswer: formData.correctAnswer, hint: formData.hint || undefined };
    try {
      if (editingId) {
        await updateQuestion.mutateAsync({ questionId: editingId, data: payload });
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createQuestion.mutateAsync({ data: payload });
        toast({ title: "تم الإنشاء بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
      setIsOpen(false);
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await deleteQuestion.mutateAsync({ questionId: id });
      queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
      toast({ title: "تم الحذف بنجاح" });
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  // ── Template download (new: no ruleId column) ──────────────────────────────
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const descRow = ["نص السؤال كاملاً", "الخيار الأول", "الخيار الثاني", "الخيار الثالث (اختياري)", "الخيار الرابع (اختياري)", "الإجابة الصحيحة (تطابق أحد الخيارات)", "تلميح (اختياري)"];
    const headerRow = ["questionText", "option1", "option2", "option3", "option4", "correctAnswer", "hint"];
    const example1 = ["ما إعراب كلمة (الطالبُ) في جملة: الطالبُ مجتهدٌ؟", "مبتدأ مرفوع", "خبر مرفوع", "فاعل مرفوع", "مفعول به منصوب", "مبتدأ مرفوع", "المبتدأ هو الاسم المرفوع الذي يُبنى عليه الكلام"];
    const example2 = ["أكمل الجملة: ذهبَ ______ إلى المدرسة", "المعلمُ", "المعلمَ", "المعلمِ", "", "المعلمُ", "الفاعل يأتي مرفوعاً دائماً بعد الفعل"];
    const ws = XLSX.utils.aoa_to_sheet([descRow, headerRow, example1, example2]);
    ws["!cols"] = [{ wch: 50 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 25 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, "الأسئلة");
    XLSX.writeFile(wb, "قالب_الأسئلة_نحوي.xlsx");
  };

  // ── Staging upload ─────────────────────────────────────────────────────────
  const parseFileToStaged = useCallback((file: File) => {
    const processRows = (rows: any[]) => {
      const staged: StagedQuestion[] = rows
        .filter(row => row.questionText || row[0])
        .map(row => {
          const q: StagedQuestion = {
            questionText: row.questionText || row[0] || "",
            option1: row.option1 || row[1] || "",
            option2: row.option2 || row[2] || "",
            option3: row.option3 || row[3] || "",
            option4: row.option4 || row[4] || "",
            correctAnswer: row.correctAnswer || row[5] || "",
            hint: row.hint || row[6] || "",
            errors: [],
          };
          q.errors = validateStaged(q);
          return q;
        })
        .filter(q => q.questionText.trim());
      setStagedQuestions(staged);
      setStagingStep("preview");
    };

    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          const headerRowIdx = allRows.findIndex(r => r.includes("questionText"));
          const headers: string[] = headerRowIdx >= 0 ? allRows[headerRowIdx] as string[] : ["questionText", "option1", "option2", "option3", "option4", "correctAnswer", "hint"];
          const dataRows = allRows.slice(headerRowIdx >= 0 ? headerRowIdx + 1 : 1).filter(r => r.some(c => c !== ""));
          const mapped = dataRows.map(row => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = String(row[i] ?? ""); });
            return obj;
          });
          processRows(mapped);
        } catch { toast({ title: "فشل قراءة ملف Excel", variant: "destructive" }); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => processRows(results.data as any[]),
      });
    }
    if (stagingFileRef.current) stagingFileRef.current.value = "";
  }, [toast]);

  const handleStagingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFileToStaged(file);
  };

  const updateStagedCell = (idx: number, field: keyof StagedQuestion, value: string) => {
    setStagedQuestions(prev => {
      const next = [...prev];
      const updated = { ...next[idx], [field]: value };
      updated.errors = validateStaged(updated);
      next[idx] = updated;
      return next;
    });
  };

  const removeStagedRow = (idx: number) => {
    setStagedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmUpload = async () => {
    if (!uploadRuleId) { toast({ title: "اختر القاعدة النحوية أولاً", variant: "destructive" }); return; }
    const validRows = stagedQuestions.filter(q => q.errors.length === 0);
    if (validRows.length === 0) { toast({ title: "لا توجد أسئلة صالحة للرفع", variant: "destructive" }); return; }
    const questionsInput = validRows.map(q => ({
      ruleId: uploadRuleId,
      questionText: q.questionText,
      options: [q.option1, q.option2, q.option3, q.option4].filter(Boolean),
      correctAnswer: q.correctAnswer,
      hint: q.hint || undefined,
    }));
    try {
      const res = await bulkCreate.mutateAsync({ data: { questions: questionsInput } });
      toast({ title: `✅ تم رفع ${res.created} سؤال بنجاح${res.failed > 0 ? `، وفشل ${res.failed}` : ""}` });
      queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
      setStagingOpen(false);
      setStagedQuestions([]);
      setStagingStep("select");
      setUploadRuleId("");
    } catch { toast({ title: "حدث خطأ أثناء الرفع", variant: "destructive" }); }
  };

  const errorCount = stagedQuestions.filter(q => q.errors.length > 0).length;
  const validCount = stagedQuestions.filter(q => q.errors.length === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">بنك الأسئلة</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
            <Download className="w-4 h-4" />
            تحميل القالب
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => { setStagingStep("select"); setStagedQuestions([]); setStagingOpen(true); }}>
            <Upload className="w-4 h-4" />
            رفع أسئلة (Excel / CSV)
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            سؤال جديد
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-64">
                <Select value={selectedRuleId} onValueChange={handleRuleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="تصفية حسب القاعدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع القواعد</SelectItem>
                    {rules?.map(rule => <SelectItem key={rule.id} value={rule.id}>{rule.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="ابحث في الأسئلة..." className="pr-9" value={searchTerm} onChange={e => handleSearchChange(e.target.value)} />
              </div>
            </div>
            {someSelected && (
              <Button variant="destructive" size="sm" className="gap-2" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4" />
                حذف {selectedIds.size} محدد
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pr-4">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="تحديد الكل" />
                </TableHead>
                <TableHead className="text-right">السؤال</TableHead>
                <TableHead className="text-right w-40">القاعدة</TableHead>
                <TableHead className="text-right w-36">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <div className="h-5 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pagedQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    لا توجد أسئلة
                  </TableCell>
                </TableRow>
              ) : (
                pagedQuestions.map(q => (
                  <TableRow
                    key={q.id}
                    className={`hover:bg-muted/50 transition-colors ${selectedIds.has(q.id) ? "bg-primary/5" : ""}`}
                  >
                    <TableCell className="pr-4">
                      <Checkbox
                        checked={selectedIds.has(q.id)}
                        onCheckedChange={() => toggleSelect(q.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[420px]">
                      <p className="truncate" title={q.questionText}>{q.questionText}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {q.options?.slice(0, 3).map((opt: string, i: number) => (
                          <Badge key={i} variant={opt === q.correctAnswer ? "default" : "secondary"} className="text-xs font-normal">
                            {opt === q.correctAnswer ? "✓ " : ""}{opt}
                          </Badge>
                        ))}
                        {q.options?.length > 3 && <Badge variant="outline" className="text-xs">+{q.options.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate">
                      {rules?.find(r => r.id === q.ruleId)?.title || "غير معروف"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => handleOpenEdit(q)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(q.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredQuestions.length > 0 && (
            <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {filteredQuestions.length} سؤال إجمالاً
                {someSelected && ` · ${selectedIds.size} محدد`}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    السابق
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    التالي
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit / Create Dialog ───────────────────────────────────────────── */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] dir-rtl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل سؤال" : "إضافة سؤال جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>القاعدة النحوية</Label>
                <Select value={formData.ruleId} onValueChange={v => setFormData({ ...formData, ruleId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر القاعدة" /></SelectTrigger>
                  <SelectContent>{rules?.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نص السؤال</Label>
                <Input required value={formData.questionText} onChange={e => setFormData({ ...formData, questionText: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {["option1", "option2", "option3", "option4"].map((field, i) => (
                  <div key={field} className="space-y-2">
                    <Label>الخيار {["الأول", "الثاني", "الثالث", "الرابع"][i]}{i >= 2 ? " (اختياري)" : ""}</Label>
                    <Input required={i < 2} value={(formData as any)[field]} onChange={e => setFormData({ ...formData, [field]: e.target.value })} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>الإجابة الصحيحة</Label>
                <Input required value={formData.correctAnswer} onChange={e => setFormData({ ...formData, correctAnswer: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>تلميح (اختياري)</Label>
                <Input value={formData.hint} onChange={e => setFormData({ ...formData, hint: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createQuestion.isPending || updateQuestion.isPending}>حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Staging Upload Dialog ──────────────────────────────────────────── */}
      <Dialog open={stagingOpen} onOpenChange={(v) => { setStagingOpen(v); if (!v) { setStagingStep("select"); setStagedQuestions([]); } }}>
        <DialogContent className="sm:max-w-5xl dir-rtl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              رفع أسئلة من ملف
            </DialogTitle>
          </DialogHeader>

          {stagingStep === "select" ? (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">الخطوة 1 — اختر القاعدة النحوية</Label>
                <p className="text-sm text-muted-foreground">ستُضاف جميع الأسئلة في الملف لهذه القاعدة تلقائياً (لا حاجة لعمود ruleId في الملف)</p>
                <Select value={uploadRuleId} onValueChange={setUploadRuleId}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="اختر القاعدة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rules?.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${uploadRuleId ? "border-primary/40 bg-primary/5" : "border-muted bg-muted/20 opacity-60"}`}>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <Label className="text-base font-semibold">الخطوة 2 — اختر ملف Excel أو CSV</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-4">الأعمدة المطلوبة: questionText، option1، option2، correctAnswer</p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  ref={stagingFileRef}
                  onChange={handleStagingFileChange}
                  className="hidden"
                  disabled={!uploadRuleId}
                />
                <Button
                  variant="outline"
                  onClick={() => stagingFileRef.current?.click()}
                  disabled={!uploadRuleId}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  اختر الملف
                </Button>
                <div className="mt-4">
                  <button onClick={handleDownloadTemplate} className="text-xs text-primary hover:underline">
                    تحميل قالب Excel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Summary bar */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge className="bg-green-500 hover:bg-green-600">{validCount} سؤال صالح</Badge>
                {errorCount > 0 && <Badge variant="destructive">{errorCount} بها أخطاء</Badge>}
                <span className="text-sm text-muted-foreground">القاعدة: <strong>{rules?.find(r => r.id === uploadRuleId)?.title}</strong></span>
                <Button variant="ghost" size="sm" className="mr-auto gap-1.5" onClick={() => { setStagingStep("select"); setStagedQuestions([]); }}>
                  <Eye className="w-4 h-4" />
                  تغيير الملف
                </Button>
              </div>

              {errorCount > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    الصفوف التي بها أخطاء (باللون الأحمر) لن تُرفع. يمكنك تعديلها هنا أو حذفها.
                  </AlertDescription>
                </Alert>
              )}

              {/* Editable preview table */}
              <div className="border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        <th className="text-right p-2 font-semibold w-8">#</th>
                        <th className="text-right p-2 font-semibold min-w-[200px]">نص السؤال</th>
                        <th className="text-right p-2 font-semibold w-28">خيار 1</th>
                        <th className="text-right p-2 font-semibold w-28">خيار 2</th>
                        <th className="text-right p-2 font-semibold w-28">خيار 3</th>
                        <th className="text-right p-2 font-semibold w-28">خيار 4</th>
                        <th className="text-right p-2 font-semibold w-28">الإجابة ✓</th>
                        <th className="text-right p-2 font-semibold w-28">تلميح</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stagedQuestions.map((q, idx) => (
                        <tr key={idx} className={q.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-muted/20"}>
                          <td className="p-1.5 text-muted-foreground text-xs">{idx + 1}</td>
                          {(["questionText", "option1", "option2", "option3", "option4", "correctAnswer", "hint"] as (keyof StagedQuestion)[]).map(field => (
                            field !== "errors" && (
                              <td key={field} className="p-1">
                                <Input
                                  value={q[field] as string}
                                  onChange={e => updateStagedCell(idx, field, e.target.value)}
                                  className={`h-7 text-xs ${field === "correctAnswer" && q.errors.some(e => e.includes("الإجابة")) ? "border-red-400" : ""}`}
                                />
                              </td>
                            )
                          ))}
                          <td className="p-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeStagedRow(idx)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setStagingOpen(false); setStagingStep("select"); setStagedQuestions([]); }}>
              إلغاء
            </Button>
            {stagingStep === "preview" && (
              <Button onClick={handleConfirmUpload} disabled={bulkCreate.isPending || validCount === 0} className="gap-2">
                <CheckSquare className="w-4 h-4" />
                تأكيد رفع {validCount} سؤال
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
