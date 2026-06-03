import { useState } from "react";
import { 
  useListUsers, 
  useUpdateUser, 
  useDeleteUser, 
  getListUsersQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsers() {
  const { data: users, isLoading } = useListUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredUsers = users?.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleRoleChange = async (userId: string, newRole: "admin" | "student") => {
    try {
      await updateUser.mutateAsync({
        userId,
        data: { role: newRole }
      });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "تم تحديث الصلاحية بنجاح" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (userId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      try {
        await deleteUser.mutateAsync({ userId });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "تم حذف المستخدم بنجاح" });
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث بالاسم أو البريد الإلكتروني..." 
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
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">البريد الإلكتروني</TableHead>
                <TableHead className="text-right">الصلاحية</TableHead>
                <TableHead className="text-right">النقاط السنوية</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد مستخدمين</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select 
                        value={user.role} 
                        onValueChange={(val: "admin" | "student") => handleRoleChange(user.id, val)}
                        disabled={updateUser.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">مسؤول</SelectItem>
                          <SelectItem value="student">طالب</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{user.xpAnnual}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
