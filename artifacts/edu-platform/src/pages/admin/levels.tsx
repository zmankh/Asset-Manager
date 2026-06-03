import { useState } from "react";
import { 
  useListLevels, 
  useCreateLevel, 
  useUpdateLevel, 
  useDeleteLevel, 
  useListGrammarRules,
  getListLevelsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Edit, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { GradeCategory } from "@/lib/auth-context";

const categoryMap: Record<GradeCategory, string> = {
  primary: "أساسي",
  middle: "إعدادي",
  secondary: "ثانوي"
};

export default function AdminLevels() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { data: rules } = useListGrammarRules();
  const { data: levels, isLoading } = useListLevels(selectedCategory !== "all" ? { category: selectedCategory as GradeCategory } : undefined);
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    order: number;
    categories: GradeCategory[];
    ruleId: string;
    passingScore: number;
    questionCount: number;
    active: boolean;
  }>({ 
    title: "", 
    description: "", 
    order: 1, 
    categories: [], 
    ruleId: "", 
    passingScore: 70, 
    questionCount: 10,
    active: true
  });

  const createLevel = useCreateLevel();
  const updateLevel = useUpdateLevel();
  const deleteLevel = useDeleteLevel();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sortedLevels = [...(levels || [])].sort((a, b) => a.order - b.order);

  const handleOpenEdit = (level: any) => {
    setEditingId(level.id);
    setFormData({ 
      title: level.title, 
      description: level.description || "", 
      order: level.order,
      categories: level.categories || [],
      ruleId: level.ruleId,
      passingScore: level.passingScore,
      questionCount: level.questionCount,
      active: level.active
    });
    setIsOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ 
      title: "", 
      description: "", 
      order: (levels?.length || 0) + 1, 
      categories: [], 
      ruleId: "", 
      passingScore: 70, 
      questionCount: 10,
      active: true
    });
    setIsOpen(true);
  };

  const handleCategoryToggle = (cat: GradeCategory) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.categories.length === 0) {
      toast({ title: "يجب اختيار فئة واحدة على الأقل", variant: "destructive" });
      return;
    }
    if (!formData.ruleId) {
      toast({ title: "يجب اختيار القاعدة النحوية", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        await updateLevel.mutateAsync({
          levelId: editingId,
          data: formData
        });
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createLevel.mutateAsync({
          data: formData
        });
        toast({ title: "تم الإنشاء بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getListLevelsQueryKey() });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      try {
        await deleteLevel.mutateAsync({ levelId: id });
        queryClient.invalidateQueries({ queryKey: getListLevelsQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  const handleMove = async (level: any, direction: 'up' | 'down') => {
    const currentIndex = sortedLevels.findIndex(l => l.id === level.id);
    if (direction === 'up' && currentIndex > 0) {
      const prev = sortedLevels[currentIndex - 1];
      await updateLevel.mutateAsync({ levelId: level.id, data: { ...level, order: prev.order } });
      await updateLevel.mutateAsync({ levelId: prev.id, data: { ...prev, order: level.order } });
    } else if (direction === 'down' && currentIndex < sortedLevels.length - 1) {
      const next = sortedLevels[currentIndex + 1];
      await updateLevel.mutateAsync({ levelId: level.id, data: { ...level, order: next.order } });
      await updateLevel.mutateAsync({ levelId: next.id, data: { ...next, order: level.order } });
    }
    queryClient.invalidateQueries({ queryKey: getListLevelsQueryKey() });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">المستويات</h1>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة مستوى جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-64">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  <SelectItem value="primary">أساسي</SelectItem>
                  <SelectItem value="middle">إعدادي</SelectItem>
                  <SelectItem value="secondary">ثانوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right w-16">الترتيب</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">الفئات</TableHead>
                <TableHead className="text-right">القاعدة</TableHead>
                <TableHead className="text-right">التفاصيل</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : sortedLevels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد مستويات</TableCell>
                </TableRow>
              ) : (
                sortedLevels.map((level, index) => (
                  <TableRow key={level.id}>
                    <TableCell>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          disabled={index === 0}
                          onClick={() => handleMove(level, 'up')}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <span className="font-bold text-sm">{level.order}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          disabled={index === sortedLevels.length - 1}
                          onClick={() => handleMove(level, 'down')}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{level.title}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {level.categories.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-xs">
                            {categoryMap[cat as GradeCategory] || cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="truncate max-w-[150px]">
                      {rules?.find(r => r.id === level.ruleId)?.title || level.ruleTitle || "غير معروف"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        <div>{level.questionCount} أسئلة</div>
                        <div>نجاح: {level.passingScore}%</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={level.active ? "default" : "outline"} className={level.active ? "bg-green-500 hover:bg-green-600" : ""}>
                        {level.active ? "نشط" : "غير نشط"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(level)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(level.id)}>
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
        <DialogContent className="sm:max-w-[600px] dir-rtl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل المستوى' : 'إضافة مستوى جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>الترتيب</Label>
                  <Input type="number" required min={1} value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 1})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الوصف (اختياري)</Label>
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label>الفئات</Label>
                <div className="flex items-center gap-4">
                  {(Object.keys(categoryMap) as GradeCategory[]).map(cat => (
                    <div key={cat} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox 
                        id={`cat-${cat}`} 
                        checked={formData.categories.includes(cat)}
                        onCheckedChange={() => handleCategoryToggle(cat)}
                      />
                      <label htmlFor={`cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {categoryMap[cat]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>القاعدة النحوية</Label>
                <Select value={formData.ruleId} onValueChange={(v) => setFormData({...formData, ruleId: v})}>
                  <SelectTrigger><SelectValue placeholder="اختر القاعدة" /></SelectTrigger>
                  <SelectContent>
                    {rules?.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نسبة النجاح (%)</Label>
                  <Input type="number" required min={1} max={100} value={formData.passingScore} onChange={e => setFormData({...formData, passingScore: parseInt(e.target.value) || 70})} />
                </div>
                <div className="space-y-2">
                  <Label>عدد الأسئلة</Label>
                  <Input type="number" required min={1} value={formData.questionCount} onChange={e => setFormData({...formData, questionCount: parseInt(e.target.value) || 10})} />
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch 
                  id="active-mode" 
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                />
                <Label htmlFor="active-mode">نشط</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createLevel.isPending || updateLevel.isPending}>حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
