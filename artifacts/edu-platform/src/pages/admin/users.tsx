import { useState } from "react";
import {
  useListUsers,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Search, Trash2, School, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user as any).schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user as any).district?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleRoleChange = async (userId: string, newRole: "admin" | "student") => {
    try {
      await updateUser.mutateAsync({ userId, data: { role: newRole } });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "تم تحديث الصلاحية بنجاح" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف "${name}"؟`)) {
      try {
        await deleteUser.mutateAsync({ userId });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "تم حذف المستخدم بنجاح" });
      } catch {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">إدارة المستخدمين</h1>
        <p className="text-muted-foreground mt-1">
          {users ? `${users.length} مستخدم مسجّل` : "جاري التحميل..."}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو البريد أو المدرسة أو المديرية..."
              className="pr-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="input-search-users"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الطالب</TableHead>
                <TableHead className="text-right">المدرسة</TableHead>
                <TableHead className="text-right">المديرية</TableHead>
                <TableHead className="text-right">الصلاحية</TableHead>
                <TableHead className="text-right">XP سنوي</TableHead>
                <TableHead className="text-right">الحذف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    لا يوجد مستخدمون مطابقون
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => {
                  const u = user as any;
                  return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      {/* Student info */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-sm">{user.displayName || "—"}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                          {user.streak > 0 && (
                            <Badge variant="outline" className="w-fit text-xs mt-0.5 border-secondary text-secondary">
                              {user.streak} يوم متواصل
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* School */}
                      <TableCell>
                        {u.schoolName ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <School className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{u.schoolName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* District */}
                      <TableCell>
                        {u.district ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{u.district}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(val: "admin" | "student") => handleRoleChange(user.id, val)}
                          disabled={updateUser.isPending}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">طالب</SelectItem>
                            <SelectItem value="admin">مسؤول</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* XP */}
                      <TableCell>
                        <span className="font-bold text-primary">{user.xpAnnual ?? 0}</span>
                      </TableCell>

                      {/* Delete */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(user.id, user.displayName || user.email)}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
