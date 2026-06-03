import { useState } from "react";
import { 
  useListNotifications, 
  useCreateNotification, 
  useUpdateNotification, 
  useDeleteNotification, 
  getListNotificationsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Edit, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function AdminNotifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{title: string, message: string, type: any, active: boolean}>({ 
    title: "", message: "", type: "info", active: true 
  });

  const createMutation = useCreateNotification();
  const updateMutation = useUpdateNotification();
  const deleteMutation = useDeleteNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOpenEdit = (n: any) => {
    setEditingId(n.id);
    setFormData({ title: n.title, message: n.message, type: n.type || "info", active: n.active });
    setIsOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ title: "", message: "", type: "info", active: true });
    setIsOpen(true);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await updateMutation.mutateAsync({
        notificationId: id,
        data: { active: !current }
      });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          notificationId: editingId,
          data: formData
        });
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createMutation.mutateAsync({
          data: formData
        });
        toast({ title: "تم الإنشاء بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      try {
        await deleteMutation.mutateAsync({ notificationId: id });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'warning': return <Badge variant="destructive">تحذير</Badge>;
      case 'success': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">نجاح</Badge>;
      case 'announcement': return <Badge variant="secondary">إعلان</Badge>;
      default: return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">معلومة</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">الإشعارات</h1>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          إشعار جديد
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right w-16">الحالة</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">الرسالة</TableHead>
                <TableHead className="text-right w-24">النوع</TableHead>
                <TableHead className="text-right w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : notifications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد إشعارات</TableCell>
                </TableRow>
              ) : (
                notifications?.map(n => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <Switch 
                        checked={n.active} 
                        onCheckedChange={() => handleToggleActive(n.id, n.active)}
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{n.message}</TableCell>
                    <TableCell>{getTypeBadge(n.type || 'info')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(n)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(n.id)}>
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
              <DialogTitle>{editingId ? 'تعديل إشعار' : 'إضافة إشعار جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
                <Switch 
                  id="active" 
                  checked={formData.active} 
                  onCheckedChange={v => setFormData({...formData, active: v})} 
                />
                <Label htmlFor="active">إشعار نشط</Label>
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">معلومة</SelectItem>
                    <SelectItem value="announcement">إعلان</SelectItem>
                    <SelectItem value="success">نجاح</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>الرسالة</Label>
                <Input required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
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
