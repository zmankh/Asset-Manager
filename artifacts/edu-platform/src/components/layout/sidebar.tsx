import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Trophy,
  BookOpen,
  Users,
  Settings,
  Bell,
  Medal,
  CreditCard,
  LogOut,
  Zap,
  Layers,
  SlidersHorizontal,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const studentLinks = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/quiz", label: "تدرّب الآن", icon: Zap },
  { href: "/leaderboard", label: "لوحة المتصدرين", icon: Trophy },
  { href: "/badges", label: "أوسمتي", icon: Medal },
];

const adminLinks = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/users", label: "إدارة المستخدمين", icon: Users },
  { href: "/admin/student-progress", label: "تقدم الطلاب", icon: BarChart2 },
  { href: "/admin/levels", label: "المستويات", icon: Layers },
  { href: "/admin/rules", label: "القواعد النحوية", icon: BookOpen },
  { href: "/admin/questions", label: "بنك الأسئلة", icon: Settings },
  { href: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { href: "/admin/leaderboard-titles", label: "ألقاب المتصدرين", icon: Medal },
  { href: "/admin/info-cards", label: "بطاقات المعلومات", icon: CreditCard },
  { href: "/admin/settings", label: "إعدادات الموقع", icon: SlidersHorizontal },
];

interface SidebarNavContentProps {
  onNavigate?: () => void;
}

export function SidebarNavContent({ onNavigate }: SidebarNavContentProps) {
  const [location] = useLocation();
  const { isAdmin, signOut, user } = useAuth();

  const links = isAdmin ? adminLinks : studentLinks;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "؟";

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-primary leading-none">نحوي</h1>
            {isAdmin && (
              <span className="text-xs text-muted-foreground font-medium">لوحة الإدارة</span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            location === link.href ||
            (link.href !== "/" && location.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              data-testid={`nav-${link.href.replace(/\//g, "-").replace(/^-/, "")}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-sidebar-accent-foreground truncate">
              {user?.displayName || user?.email?.split("@")[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl font-semibold"
          onClick={() => signOut()}
          data-testid="button-signout"
        >
          <LogOut className="w-4 h-4 ml-2" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <div className="w-64 border-l bg-sidebar flex flex-col h-full sticky top-0 right-0">
      <SidebarNavContent />
    </div>
  );
}
