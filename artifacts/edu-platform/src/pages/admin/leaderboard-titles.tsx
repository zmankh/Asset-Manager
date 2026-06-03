import { useState } from "react";
import { 
  useListLeaderboardTitles, 
  useCreateLeaderboardTitle, 
  useUpdateLeaderboardTitle, 
  useDeleteLeaderboardTitle, 
  getListLeaderboardTitlesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Edit, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function AdminLeaderboardTitles() {
  const { data: titles, isLoading } = useListLeaderboardTitles();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{title: string, minRank: number, maxRank: number, description: string}>({ 
    title: "", minRank: 1, maxRank: 10, description: "" 
  });

  const createMutation = useCreateLeaderboardTitle();
  const updateMutation = useUpdateLeaderboardTitle();
  const deleteMutation = useDeleteLeaderboardTitle();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOpenEdit = (t: any) => {
    setEditingId(t.id);
    setFormData({ title: t.title, minRank: t.minRank, maxRank: t.maxRank, description: t.description || "" });
    setIsOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ title: "", minRank: 1, maxRank: 10, description: "" });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          titleId: editingId,
          data: formData
        });
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createMutation.mutateAsync({
          data: formData
        });
        toast({ title: "تم الإنشاء بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getListLeaderboardTitlesQueryKey() });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      try {
        await deleteMutation.mutateAsync({ titleId: id });
        queryClient.invalidateQueries({ queryKey: getListLeaderboardTitlesQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">ألقاب المتصدرين</h1>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة لقب جديد
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اللقب</TableHead>
                <TableHead className="text-right">الرتب (من - إلى)</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : titles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد ألقاب</TableCell>
                </TableRow>
              ) : (
                titles?.sort((a,b) => a.minRank - b.minRank).map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-bold text-secondary">{t.title}</TableCell>
                    <TableCell>{t.minRank} - {t.maxRank}</TableCell>
                    <TableCell className="text-muted-foreground">{t.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(t)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(t.id)}>
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
        <DialogContent className="sm:max-w-[500px] dir-rtl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل لقب' : 'إضافة لقب جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>اللقب</Label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="مثال: نحوي محترف" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>من رتبة</Label>
                  <Input type="number" min={1} required value={formData.minRank} onChange={e => setFormData({...formData, minRank: parseInt(e.target.value) || 1})} />
                </div>
                <div className="space-y-2">
                  <Label>إلى رتبة</Label>
                  <Input type="number" min={1} required value={formData.maxRank} onChange={e => setFormData({...formData, maxRank: parseInt(e.target.value) || 1})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الوصف (اختياري)</Label>
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
