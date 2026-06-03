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
    const headers = "ruleId,questionText,option1,option2,option3,option4,correctAnswer,hint\n";
    const sample = `${rules?.[0]?.id || "RULE_ID"},"ما هو إعراب الكلمة؟","مبتدأ","خبر","فاعل","مفعول به","مبتدأ","مرفوع وعلامة رفعه الضمة"\n`;
    const blob = new Blob(["\uFEFF" + headers + sample], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "questions_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const questionsInput = results.data.map((row: any) => ({
          ruleId: row.ruleId,
          questionText: row.questionText,
          options: [row.option1, row.option2, row.option3, row.option4].filter(Boolean),
          correctAnswer: row.correctAnswer,
          hint: row.hint || undefined
        }));

        try {
          const res = await bulkCreate.mutateAsync({ data: { questions: questionsInput } });
          toast({ title: `تم رفع ${res.created} سؤال بنجاح، وفشل ${res.failed}` });
          queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        } catch (error) {
          toast({ title: "حدث خطأ أثناء الرفع", variant: "destructive" });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
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
              accept=".csv" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              رفع أسئلة (CSV)
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
