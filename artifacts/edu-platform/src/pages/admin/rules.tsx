import { useState } from "react";
import { 
  useListGrammarRules, 
  useCreateGrammarRule, 
  useUpdateGrammarRule, 
  useDeleteGrammarRule, 
  getListGrammarRulesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Search, Trash2, Edit, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function AdminRules() {
  const { data: rules, isLoading } = useListGrammarRules();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ title: "", description: "", explanation: "" });

  const createRule = useCreateGrammarRule();
  const updateRule = useUpdateGrammarRule();
  const deleteRule = useDeleteGrammarRule();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredRules = rules?.filter(rule => 
    rule.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleOpenEdit = (rule: any) => {
    setEditingId(rule.id);
    setFormData({ title: rule.title, description: rule.description, explanation: rule.explanation });
    setIsOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ title: "", description: "", explanation: "" });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateRule.mutateAsync({
          ruleId: editingId,
          data: formData
        });
        toast({ title: "تم تحديث القاعدة بنجاح" });
      } else {
        await createRule.mutateAsync({
          data: formData
        });
        toast({ title: "تم إنشاء القاعدة بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getListGrammarRulesQueryKey() });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      try {
        await deleteRule.mutateAsync({ ruleId: id });
        queryClient.invalidateQueries({ queryKey: getListGrammarRulesQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">القواعد النحوية</h1>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة قاعدة جديدة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث بالعنوان..." 
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
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right">عدد الأسئلة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد قواعد</TableCell>
                </TableRow>
              ) : (
                filteredRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.title}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{rule.description}</TableCell>
                    <TableCell>{rule.questionCount || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(rule)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(rule.id)}>
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
        <DialogContent className="sm:max-w-[600px] dir-rtl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل القاعدة' : 'إضافة قاعدة جديدة'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>الوصف (نبذة قصيرة)</Label>
                <Input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>الشرح التفصيلي</Label>
                <Textarea required className="min-h-[150px]" value={formData.explanation} onChange={e => setFormData({...formData, explanation: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
