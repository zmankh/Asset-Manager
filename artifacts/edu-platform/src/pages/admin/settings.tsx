import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Globe, Home, Bell, CreditCard, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { auth } from "@/lib/firebase";

interface SiteSettings {
  platformTitle: string;
  platformSubtitle: string;
  homeWelcomeTitle: string;
  homeAnnouncementActive: boolean;
  homeAnnouncementText: string;
}

const DEFAULT: SiteSettings = {
  platformTitle: "نحوي",
  platformSubtitle: "تعلّم النحو العربي بطريقة ممتعة وتنافسية",
  homeWelcomeTitle: "استمر في التعلم وحقق أهدافك النحوية",
  homeAnnouncementActive: false,
  homeAnnouncementText: "",
};

async function apiRequest(method: string, body?: any) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/settings`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error("فشل الطلب");
  return res.json();
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    apiRequest("GET")
      .then((data) => setSettings({ ...DEFAULT, ...data }))
      .catch(() => setSettings(DEFAULT))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiRequest("PATCH", settings);
      setSettings({ ...DEFAULT, ...updated });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    } catch {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" />
          إعدادات الموقع
        </h1>
        <p className="text-muted-foreground mt-1">تحكم في عنوان المنصة، الشاشة الرئيسية، والمحتوى العام</p>
      </div>

      {/* Platform Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-primary" />
            هوية المنصة
          </CardTitle>
          <CardDescription>العنوان الرئيسي والوصف المختصر لمنصتك الظاهران في الشريط الجانبي وصفحة الدخول</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">اسم المنصة</Label>
            <Input
              value={settings.platformTitle}
              onChange={(e) => setSettings((s) => ({ ...s, platformTitle: e.target.value }))}
              placeholder="نحوي"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">يظهر في الشريط الجانبي وعلامة التبويب وصفحة تسجيل الدخول</p>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">الوصف المختصر</Label>
            <Input
              value={settings.platformSubtitle}
              onChange={(e) => setSettings((s) => ({ ...s, platformSubtitle: e.target.value }))}
              placeholder="تعلّم النحو العربي بطريقة ممتعة وتنافسية"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">يظهر أسفل اسم المنصة في صفحة تسجيل الدخول</p>
          </div>
        </CardContent>
      </Card>

      {/* Home Screen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="w-5 h-5 text-primary" />
            الشاشة الرئيسية للطالب
          </CardTitle>
          <CardDescription>العبارات التحفيزية والرسائل الظاهرة في الصفحة الرئيسية بعد تسجيل الدخول</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">رسالة التحفيز</Label>
            <Input
              value={settings.homeWelcomeTitle}
              onChange={(e) => setSettings((s) => ({ ...s, homeWelcomeTitle: e.target.value }))}
              placeholder="استمر في التعلم وحقق أهدافك النحوية"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">تظهر أسفل اسم الطالب في الشاشة الرئيسية</p>
          </div>
        </CardContent>
      </Card>

      {/* Announcement Banner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-primary" />
            إعلان عاجل (بانر الشاشة الرئيسية)
          </CardTitle>
          <CardDescription>إعلان يظهر بشكل بارز أعلى الشاشة الرئيسية لجميع الطلاب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="ann-active"
              checked={settings.homeAnnouncementActive}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, homeAnnouncementActive: v }))}
            />
            <Label htmlFor="ann-active" className="font-semibold cursor-pointer">
              {settings.homeAnnouncementActive ? "الإعلان مفعّل (يظهر للطلاب)" : "الإعلان معطّل"}
            </Label>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">نص الإعلان</Label>
            <Textarea
              value={settings.homeAnnouncementText}
              onChange={(e) => setSettings((s) => ({ ...s, homeAnnouncementText: e.target.value }))}
              placeholder="مثال: بدء امتحانات الفصل الأول الأسبوع القادم — استعدّوا جيداً!"
              rows={3}
              maxLength={300}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Cards Shortcut */}
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-primary" />
            بطاقات المعلومات
          </CardTitle>
          <CardDescription>
            تُعرض البطاقات للطلاب في الشاشة الرئيسية. يمكنك تفعيل/تعطيل وتعديل كل بطاقة من صفحة إدارة البطاقات.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/info-cards">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              إدارة بطاقات المعلومات
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[140px]">
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>
    </div>
  );
}
