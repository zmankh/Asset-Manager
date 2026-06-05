import { useState, useEffect } from "react";
import {
  useListNotifications,
  useCreateNotification,
  useUpdateNotification,
  useDeleteNotification,
  getListNotificationsQueryKey,
  useListUsers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Edit, Plus, Send, Users, User, History, Bell, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { auth } from "@/lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  target: "all" | "specific";
  targetUserName?: string;
  sentCount: number;
  sentAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

const typeOptions = [
  { value: "info", label: "معلومة", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "announcement", label: "إعلان", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "level", label: "مستوى", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "streak", label: "متتالية", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "badge", label: "وسام", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
];

function TypeBadge({ type }: { type: string }) {
  const opt = typeOptions.find((o) => o.value === type);
  return (
    <Badge variant="outline" className={opt?.color ?? "bg-gray-50 text-gray-700"}>
      {opt?.label ?? type}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminNotifications() {
  // ── Global notifications (existing) ──────────────────────────────────────
  const { data: notifications, isLoading } = useListNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ title: string; message: string; type: any; active: boolean }>({
    title: "", message: "", type: "info", active: true,
  });
  const createMutation = useCreateNotification();
  const updateMutation = useUpdateNotification();
  const deleteMutation = useDeleteNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Broadcast ────────────────────────────────────────────────────────────
  const { data: allUsers } = useListUsers();
  const students = (allUsers ?? []).filter((u: any) => u.role === "student");

  const [bTarget, setBTarget] = useState<"all" | "specific">("all");
  const [bUserId, setBUserId] = useState("");
  const [bType, setBType] = useState("info");
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bSending, setBSending] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const r = await apiFetch("/user-notifications/broadcasts");
      if (r.ok) setHistory(await r.json());
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const filteredStudents = students.filter((u: any) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (u.displayName ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const selectedUser = students.find((u: any) => u.id === bUserId);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle.trim() || !bMessage.trim()) return;
    if (bTarget === "specific" && !bUserId) {
      toast({ title: "اختر طالباً", variant: "destructive" }); return;
    }
    setBSending(true);
    try {
      const body: any = { title: bTitle, message: bMessage, type: bType };
      if (bTarget === "specific") {
        body.targetUserId = bUserId;
        body.targetUserName = selectedUser?.displayName ?? selectedUser?.email ?? bUserId;
      }
      const r = await apiFetch("/user-notifications/broadcast", {
        method: "POST", body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      toast({ title: `✅ تم الإرسال بنجاح`, description: `أُرسل إلى ${data.sent} طالب` });
      setBTitle(""); setBMessage(""); setBUserId(""); setUserSearch("");
      fetchHistory();
    } catch {
      toast({ title: "حدث خطأ أثناء الإرسال", variant: "destructive" });
    } finally {
      setBSending(false);
    }
  };

  // ── Global notifications handlers ─────────────────────────────────────────
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
      await updateMutation.mutateAsync({ notificationId: id, data: { active: !current } });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ notificationId: editingId, data: formData });
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createMutation.mutateAsync({ data: formData });
        toast({ title: "تم الإنشاء بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      setIsOpen(false);
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await deleteMutation.mutateAsync({ notificationId: id });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      toast({ title: "تم الحذف بنجاح" });
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإشعارات</h1>
        <p className="text-muted-foreground mt-1">إدارة الإشعارات العامة وإرسال إشعارات شخصية للطلاب</p>
      </div>

      <Tabs defaultValue="broadcast" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="broadcast" className="gap-2">
            <Megaphone className="w-4 h-4" />
            إرسال إشعار شخصي
          </TabsTrigger>
          <TabsTrigger value="global" className="gap-2">
            <Bell className="w-4 h-4" />
            الإشعارات العامة
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Broadcast ─────────────────────────────────────────────── */}
        <TabsContent value="broadcast" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Send Form */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  إرسال إشعار
                </CardTitle>
                <CardDescription>
                  أرسل إشعاراً لجميع الطلاب أو لطالب محدد
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBroadcast} className="space-y-4">
                  {/* Target selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setBTarget("all"); setBUserId(""); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        bTarget === "all"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      جميع الطلاب
                      <span className="text-xs opacity-70">({students.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBTarget("specific")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        bTarget === "specific"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      طالب محدد
                    </button>
                  </div>

                  {/* Student search (if specific) */}
                  {bTarget === "specific" && (
                    <div className="space-y-2">
                      <Label>اختر الطالب</Label>
                      <Input
                        placeholder="ابحث بالاسم أو البريد..."
                        value={userSearch}
                        onChange={(e) => { setUserSearch(e.target.value); setBUserId(""); }}
                      />
                      {userSearch && (
                        <div className="border border-border rounded-xl overflow-hidden">
                          <ScrollArea className="max-h-44">
                            {filteredStudents.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">لا نتائج</p>
                            ) : (
                              filteredStudents.slice(0, 8).map((u: any) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => { setBUserId(u.id); setUserSearch(u.displayName ?? u.email ?? u.id); }}
                                  className={`w-full text-right px-4 py-2.5 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 ${
                                    bUserId === u.id ? "bg-primary/10" : ""
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-semibold">{u.displayName ?? "—"}</p>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    {u.gradeCategory ?? "طالب"}
                                  </span>
                                </button>
                              ))
                            )}
                          </ScrollArea>
                        </div>
                      )}
                      {bUserId && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                            {(selectedUser?.displayName ?? selectedUser?.email ?? "؟")[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{selectedUser?.displayName ?? selectedUser?.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{selectedUser?.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setBUserId(""); setUserSearch(""); }}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >✕</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Type */}
                  <div className="space-y-2">
                    <Label>نوع الإشعار</Label>
                    <div className="flex flex-wrap gap-2">
                      {typeOptions.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setBType(t.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            bType === t.value
                              ? t.color + " border-current scale-105 shadow-sm"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label>العنوان</Label>
                    <Input
                      required
                      placeholder="مثال: إعلان هام..."
                      value={bTitle}
                      onChange={(e) => setBTitle(e.target.value)}
                      maxLength={80}
                    />
                    <p className="text-xs text-muted-foreground text-left">{bTitle.length}/80</p>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label>الرسالة</Label>
                    <Textarea
                      required
                      placeholder="اكتب نص الإشعار هنا..."
                      value={bMessage}
                      onChange={(e) => setBMessage(e.target.value)}
                      rows={3}
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground text-left">{bMessage.length}/300</p>
                  </div>

                  {/* Preview */}
                  {(bTitle || bMessage) && (
                    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-1">
                      <p className="text-xs font-bold text-primary/70 mb-2">معاينة</p>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          bType === "badge" ? "bg-yellow-100" :
                          bType === "level" ? "bg-green-100" :
                          bType === "streak" ? "bg-orange-100" :
                          "bg-blue-100"
                        }`}>
                          <span className="text-sm">
                            {bType === "badge" ? "🏅" : bType === "level" ? "🎉" : bType === "streak" ? "🔥" : "ℹ️"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold">{bTitle || "العنوان"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{bMessage || "نص الرسالة"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={bSending || !bTitle || !bMessage || (bTarget === "specific" && !bUserId)}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {bSending ? (
                      <><span className="animate-spin">⏳</span> جاري الإرسال...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {bTarget === "all" ? `إرسال لجميع الطلاب (${students.length})` : "إرسال للطالب"}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-4 h-4 text-muted-foreground" />
                    سجل الإرسال
                  </CardTitle>
                  <button
                    onClick={fetchHistory}
                    className="text-xs text-primary hover:underline"
                    disabled={historyLoading}
                  >
                    تحديث
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[520px]">
                  {historyLoading ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      جاري التحميل...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                      <History className="w-6 h-6 opacity-30" />
                      <p className="text-sm">لا يوجد سجل بعد</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {history.map((h) => (
                        <div key={h.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold leading-tight flex-1 truncate">{h.title}</p>
                            <TypeBadge type={h.type} />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{h.message}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {h.target === "all" ? (
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5" />
                                  {h.sentCount} طالب
                                </span>
                              ) : (
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <User className="w-2.5 h-2.5" />
                                  {h.targetUserName ?? "طالب محدد"}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground/60">{timeAgo(h.sentAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Global Notifications ──────────────────────────────────── */}
        <TabsContent value="global" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                تظهر هذه الإشعارات كبانر لجميع المستخدمين في الموقع
              </p>
            </div>
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
                    <TableHead className="text-right w-28">النوع</TableHead>
                    <TableHead className="text-right w-28">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                    </TableRow>
                  ) : !notifications?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        لا توجد إشعارات عامة
                      </TableCell>
                    </TableRow>
                  ) : (
                    notifications?.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell>
                          <Switch
                            checked={n.active}
                            onCheckedChange={() => handleToggleActive(n.id, n.active)}
                            disabled={updateMutation.isPending}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{n.title}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-muted-foreground text-sm">{n.message}</TableCell>
                        <TableCell><TypeBadge type={n.type || "info"} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(n)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(n.id)}
                            >
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
        </TabsContent>
      </Tabs>

      {/* Dialog: Create/Edit global notification */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] dir-rtl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل إشعار" : "إضافة إشعار عام جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                />
                <Label htmlFor="active">إشعار نشط (يظهر للجميع)</Label>
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
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
                <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الرسالة</Label>
                <Textarea
                  required
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "حفظ التعديلات" : "إنشاء"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
