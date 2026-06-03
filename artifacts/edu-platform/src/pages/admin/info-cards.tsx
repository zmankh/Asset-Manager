import { useState } from "react";
import { 
  useListInfoCards, 
  useCreateInfoCard, 
  useUpdateInfoCard, 
  useDeleteInfoCard, 
  getListInfoCardsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Edit, Plus, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function AdminInfoCards() {
  const { data: cards, isLoading } = useListInfoCards();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{title: string, content: string, order: number, active: boolean}>({ 
    title: "", content: "", order: 0, active: true 
  });

  const createMutation = useCreateInfoCard();
  const updateMutation = useUpdateInfoCard();
  const deleteMutation = useDeleteInfoCard();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOpenEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({ title: c.title, content: c.content, order: c.order || 0, active: c.active });
    setIsOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ title: "", content: "", order: cards?.length || 0, active: true });
    setIsOpen(true);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await updateMutation.mutateAsync({
        cardId: id,
        data: { active: !current }
      });
      queryClient.invalidateQueries({ queryKey: getListInfoCardsQueryKey() });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          cardId: editingId,
          data: formData
        });
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createMutation.mutateAsync({
          data: formData
        });
        toast({ title: "تم الإنشاء بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getListInfoCardsQueryKey() });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      try {
        await deleteMutation.mutateAsync({ cardId: id });
        queryClient.invalidateQueries({ queryKey: getListInfoCardsQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">بطاقات المعلومات</h1>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة بطاقة
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="text-right w-16">الحالة</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">المحتوى</TableHead>
                <TableHead className="text-right w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : cards?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد بطاقات</TableCell>
                </TableRow>
              ) : (
                cards?.sort((a,b) => (a.order||0) - (b.order||0)).map(c => (
                  <TableRow key={c.id}>
                    <TableCell><GripVertical className="w-4 h-4 text-muted-foreground" /></TableCell>
                    <TableCell>
                      <Switch 
                        checked={c.active} 
                        onCheckedChange={() => handleToggleActive(c.id, c.active)}
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="max-w-[400px] truncate">{c.content}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(c)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
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
              <DialogTitle>{editingId ? 'تعديل بطاقة' : 'إضافة بطاقة جديدة'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
                <Switch 
                  id="active" 
                  checked={formData.active} 
                  onCheckedChange={v => setFormData({...formData, active: v})} 
                />
                <Label htmlFor="active">بطاقة نشطة</Label>
              </div>
              <div className="space-y-2">
                <Label>الترتيب</Label>
                <Input type="number" required value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value)||0})} />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>المحتوى</Label>
                <Input required value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
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
