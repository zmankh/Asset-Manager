import { useState, useRef } from "react";
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
import { Search, Trash2, Edit, Plus, Upload, Download } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export default function AdminQuestions() {
  const [selectedRuleId, setSelectedRuleId] = useState<string>("all");
  const { data: rules } = useListGrammarRules();
  const { data: questions, isLoading } = useListQuestions({ ruleId: selectedRuleId === "all" ? undefined : selectedRuleId });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    ruleId: "", 
    questionText: "", 
    option1: "", option2: "", option3: "", option4: "", 
    correctAnswer: "", 
    hint: "" 
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

  const handleOpenEdit = (q: any) => {
    setEditingId(q.id);
    setFormData({ 
      ruleId: q.ruleId, 
      questionText: q.questionText, 
      option1: q.options[0] || "", 
      option2: q.options[1] || "", 
      option3: q.options[2] || "", 
      option4: q.options[3] || "", 
      correctAnswer: q.correctAnswer, 
      hint: q.hint || "" 
    });
    setIsOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ 
      ruleId: selectedRuleId !== "all" ? selectedRuleId : (rules?.[0]?.id || ""), 
      questionText: "", 
      option1: "", option2: "", option3: "", option4: "", 
      correctAnswer: "", 
      hint: "" 
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

    const payload = {
      ruleId: formData.ruleId,
      questionText: formData.questionText,
      options,
      correctAnswer: formData.correctAnswer,
      hint: formData.hint || undefined
    };

    try {
      if (editingId) {
        await updateQuestion.mutateAsync({
          questionId: editingId,
          data: payload
        });
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createQuestion.mutateAsync({
          data: payload
        });
        toast({ title: "تم الإنشاء بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      try {
        await deleteQuestion.mutateAsync({ questionId: id });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // ---- Sheet 1: قالب الأسئلة ----
    // Row 1: Arabic column descriptions (guide row, highlighted)
    const descRow = [
      "معرّف القاعدة (انسخه من ورقة القواعد)",
      "نص السؤال كاملاً",
      "الخيار الأول",
      "الخيار الثاني",
      "الخيار الثالث (اختياري)",
      "الخيار الرابع (اختياري)",
      "الإجابة الصحيحة — يجب أن تطابق أحد الخيارات أعلاه",
      "تلميح يظهر عند الإجابة الخاطئة (اختياري)",
    ];

    // Row 2: Technical headers (what the system reads during upload)
    const headerRow = ["ruleId", "questionText", "option1", "option2", "option3", "option4", "correctAnswer", "hint"];

    // Rows 3-4: Two complete Arabic examples
    const firstRuleId = rules?.[0]?.id || "ضع_معرّف_القاعدة_هنا";
    const secondRuleId = rules?.[1]?.id || rules?.[0]?.id || "ضع_معرّف_القاعدة_هنا";

    const example1 = [
      firstRuleId,
      "ما إعراب كلمة (الطالبُ) في جملة: الطالبُ مجتهدٌ؟",
      "مبتدأ مرفوع",
      "خبر مرفوع",
      "فاعل مرفوع",
      "مفعول به منصوب",
      "مبتدأ مرفوع",
      "المبتدأ هو الاسم المرفوع الذي يُبنى عليه الكلام",
    ];

    const example2 = [
      secondRuleId,
      "أكمل الجملة بالكلمة الصحيحة: ذهبَ ______ إلى المدرسة",
      "المعلمُ",
      "المعلمَ",
      "المعلمِ",
      "للمعلمِ",
      "المعلمُ",
      "الفاعل يأتي مرفوعاً دائماً بعد الفعل",
    ];

    const ws = XLSX.utils.aoa_to_sheet([descRow, headerRow, example1, example2]);

    // Column widths
    ws["!cols"] = [
      { wch: 40 }, { wch: 50 }, { wch: 22 }, { wch: 22 },
      { wch: 22 }, { wch: 22 }, { wch: 25 }, { wch: 40 },
    ];

    // Style row 1 (description) — yellow background
    const descCells = ["A1","B1","C1","D1","E1","F1","G1","H1"];
    descCells.forEach((addr) => {
      if (ws[addr]) {
        ws[addr].s = {
          fill: { fgColor: { rgb: "FFF3B0" } },
          font: { bold: true, sz: 10 },
          alignment: { horizontal: "right", vertical: "center", wrapText: true },
        };
      }
    });

    // Style row 2 (technical headers) — purple/primary background
    const headerCells = ["A2","B2","C2","D2","E2","F2","G2","H2"];
    headerCells.forEach((addr) => {
      if (ws[addr]) {
        ws[addr].s = {
          fill: { fgColor: { rgb: "7C3AED" } },
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
          alignment: { horizontal: "center" },
        };
      }
    });

    XLSX.utils.book_append_sheet(wb, ws, "الأسئلة");

    // ---- Sheet 2: القواعد المتاحة ----
    const rulesData = [
      ["معرّف القاعدة (ruleId)", "اسم القاعدة — انسخ المعرّف بالكامل"],
      ...(rules || []).map((r) => [r.id, r.title]),
    ];

    if (!rules || rules.length === 0) {
      rulesData.push(["لا توجد قواعد بعد", "أضف قواعد نحوية أولاً من صفحة القواعد النحوية"]);
    }

    const wsRules = XLSX.utils.aoa_to_sheet(rulesData);
    wsRules["!cols"] = [{ wch: 36 }, { wch: 45 }];

    // Header style for rules sheet
    if (wsRules["A1"]) wsRules["A1"].s = { fill: { fgColor: { rgb: "7C3AED" } }, font: { bold: true, color: { rgb: "FFFFFF" } } };
    if (wsRules["B1"]) wsRules["B1"].s = { fill: { fgColor: { rgb: "7C3AED" } }, font: { bold: true, color: { rgb: "FFFFFF" } } };

    XLSX.utils.book_append_sheet(wb, wsRules, "القواعد المتاحة");

    XLSX.writeFile(wb, "قالب_الأسئلة_نحوي.xlsx");
  };

  const parseAndUploadQuestions = async (rows: any[]) => {
    // Filter rows that have required fields and skip description/empty rows
    const questionsInput = rows
      .filter((row: any) => row.ruleId && row.questionText && row.correctAnswer &&
        // Skip rows where ruleId looks like a description (too long or contains spaces > 50 chars)
        row.ruleId.length < 50 && row.questionText.length > 3)
      .map((row: any) => ({
        ruleId: row.ruleId,
        questionText: row.questionText,
        options: [row.option1, row.option2, row.option3, row.option4].filter(Boolean),
        correctAnswer: row.correctAnswer,
        hint: row.hint || undefined,
      }));

    if (questionsInput.length === 0) {
      toast({ title: "لم يتم العثور على أسئلة صالحة في الملف", variant: "destructive" });
      return;
    }

    try {
      const res = await bulkCreate.mutateAsync({ data: { questions: questionsInput } });
      toast({ title: `✅ تم رفع ${res.created} سؤال بنجاح${res.failed > 0 ? `، وفشل ${res.failed}` : ""}` });
      queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
    } catch (error) {
      toast({ title: "حدث خطأ أثناء الرفع", variant: "destructive" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isXlsx) {
      // Parse Excel file — use technical header row (row 2, index 1) and skip description row
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          // Get all rows as arrays
          const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          // Find the technical header row (the one containing "ruleId")
          let headerRowIdx = allRows.findIndex((r) => r.includes("ruleId"));
          if (headerRowIdx === -1) headerRowIdx = 0; // fallback to first row
          const headers: string[] = allRows[headerRowIdx] as string[];
          const dataRows = allRows.slice(headerRowIdx + 1).filter(row => row.some(c => c !== ""));
          const mapped = dataRows.map((row: any[]) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
            return obj;
          });
          await parseAndUploadQuestions(mapped);
        } catch {
          toast({ title: "فشل قراءة ملف Excel", variant: "destructive" });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV parsing (original behavior)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await parseAndUploadQuestions(results.data as any[]);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">بنك الأسئلة</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
            <Download className="w-4 h-4" />
            تحميل القالب
          </Button>
          <div className="relative">
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              رفع أسئلة (Excel / CSV)
            </Button>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            سؤال جديد
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-64">
              <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب القاعدة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع القواعد</SelectItem>
                  {rules?.map(rule => (
                    <SelectItem key={rule.id} value={rule.id}>{rule.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث في الأسئلة..." 
                className="pr-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">السؤال</TableHead>
                <TableHead className="text-right w-48">القاعدة</TableHead>
                <TableHead className="text-right w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">لا توجد أسئلة</TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium max-w-[400px] truncate" title={q.questionText}>{q.questionText}</TableCell>
                    <TableCell className="truncate">
                      {rules?.find(r => r.id === q.ruleId)?.title || "غير معروف"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(q)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(q.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] dir-rtl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل سؤال' : 'إضافة سؤال جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>القاعدة النحوية</Label>
                <Select value={formData.ruleId} onValueChange={(v) => setFormData({...formData, ruleId: v})}>
                  <SelectTrigger><SelectValue placeholder="اختر القاعدة" /></SelectTrigger>
                  <SelectContent>
                    {rules?.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نص السؤال</Label>
                <Input required value={formData.questionText} onChange={e => setFormData({...formData, questionText: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الخيار الأول</Label>
                  <Input required value={formData.option1} onChange={e => setFormData({...formData, option1: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>الخيار الثاني</Label>
                  <Input required value={formData.option2} onChange={e => setFormData({...formData, option2: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>الخيار الثالث (اختياري)</Label>
                  <Input value={formData.option3} onChange={e => setFormData({...formData, option3: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>الخيار الرابع (اختياري)</Label>
                  <Input value={formData.option4} onChange={e => setFormData({...formData, option4: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الإجابة الصحيحة (يجب أن تطابق أحد الخيارات)</Label>
                <Input required value={formData.correctAnswer} onChange={e => setFormData({...formData, correctAnswer: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>تلميح/توضيح للإجابة الخاطئة (اختياري)</Label>
                <Input value={formData.hint} onChange={e => setFormData({...formData, hint: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createQuestion.isPending || updateQuestion.isPending}>حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
