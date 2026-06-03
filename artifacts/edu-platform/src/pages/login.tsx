import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, BookOpen, Star, Zap } from "lucide-react";

type Mode = "login" | "signup";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup") {
      if (password !== confirmPassword) {
        toast({
          title: "كلمات المرور غير متطابقة",
          description: "تأكد من أن كلمة المرور وتأكيدها متطابقتان",
          variant: "destructive",
        });
        return;
      }
      if (!schoolName.trim() || !district.trim()) {
        toast({
          title: "بيانات ناقصة",
          description: "يرجى ملء اسم المدرسة والمديرية",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp({ email, password, displayName, schoolName, district });
      }
      setLocation("/");
    } catch (error: any) {
      let description = mode === "signup"
        ? "تعذّر إنشاء الحساب. تأكد من صحة البيانات."
        : "يرجى التحقق من البريد الإلكتروني وكلمة المرور.";

      if (error?.code === "auth/email-already-in-use") {
        description = "هذا البريد الإلكتروني مسجّل مسبقاً. سجّل دخولك بدلاً من ذلك.";
      } else if (error?.code === "auth/weak-password") {
        description = "كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل.";
      } else if (error?.code === "auth/invalid-email") {
        description = "البريد الإلكتروني غير صالح.";
      } else if (
        error?.code === "auth/user-not-found" ||
        error?.code === "auth/wrong-password" ||
        error?.code === "auth/invalid-credential"
      ) {
        description = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      }

      toast({
        title: mode === "signup" ? "خطأ في إنشاء الحساب" : "خطأ في تسجيل الدخول",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setEmail(""); setPassword(""); setConfirmPassword("");
    setDisplayName(""); setSchoolName(""); setDistrict("");
  };

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="fixed top-10 right-10 w-24 h-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-32 h-32 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/4 w-20 h-20 rounded-full bg-accent/30 blur-xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center text-center mb-6 space-y-3">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-3xl flex items-center justify-center shadow-lg shadow-primary/30">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -left-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center shadow-md">
              <Star className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-primary tracking-tight">نحوي</h1>
          <p className="text-muted-foreground text-sm font-medium">
            {mode === "login"
              ? "مرحباً بعودتك! سجّل دخولك للمتابعة"
              : "انضم إلى نحوي وابدأ رحلتك التعليمية"}
          </p>
        </div>

        {/* Toggle tabs */}
        <div className="flex bg-muted rounded-2xl p-1 mb-5 gap-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            data-testid="tab-login"
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              mode === "login"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            data-testid="tab-signup"
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              mode === "signup"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-primary/10 border border-border p-7 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── SIGNUP ONLY FIELDS ── */}
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="font-bold text-foreground text-sm">
                    الاسم الكامل
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="محمد أحمد الزهراني"
                    required
                    data-testid="input-displayName"
                    className="rounded-xl h-11 border-border/70 focus:border-primary/50 bg-muted/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="schoolName" className="font-bold text-foreground text-sm">
                    اسم المدرسة
                  </Label>
                  <Input
                    id="schoolName"
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="مدرسة الأمير فيصل الثانوية"
                    required
                    data-testid="input-schoolName"
                    className="rounded-xl h-11 border-border/70 focus:border-primary/50 bg-muted/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="district" className="font-bold text-foreground text-sm">
                    المديرية
                  </Label>
                  <Input
                    id="district"
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="مديرية تربية عمان الأولى"
                    required
                    data-testid="input-district"
                    className="rounded-xl h-11 border-border/70 focus:border-primary/50 bg-muted/30"
                  />
                </div>
              </>
            )}

            {/* ── SHARED FIELDS ── */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-bold text-foreground text-sm">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.com"
                required
                data-testid="input-email"
                className="rounded-xl h-11 border-border/70 focus:border-primary/50 bg-muted/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-bold text-foreground text-sm">
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="input-password"
                className="rounded-xl h-11 border-border/70 focus:border-primary/50 bg-muted/30"
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="font-bold text-foreground text-sm">
                  تأكيد كلمة المرور
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="input-confirmPassword"
                  className="rounded-xl h-11 border-border/70 focus:border-primary/50 bg-muted/30"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/25 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "جاري تسجيل الدخول..." : "جاري إنشاء الحساب..."}
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  {mode === "login" ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {mode === "login" ? "دخول" : "إنشاء الحساب"}
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-bold hover:underline"
              data-testid="link-switch-mode"
            >
              {mode === "login" ? "سجّل الآن" : "سجّل دخولك"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          تعلّم النحو بطريقة ممتعة وتنافسية
        </p>
      </div>
    </div>
  );
}
