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
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [location] = useLocation();
  const { isAdmin, signOut } = useAuth();

  const studentLinks = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/quiz", label: "اختبار جديد", icon: BookOpen },
    { href: "/leaderboard", label: "لوحة المتصدرين", icon: Trophy },
  ];

  const adminLinks = [
    { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/admin/users", label: "إدارة المستخدمين", icon: Users },
    { href: "/admin/rules", label: "القواعد النحوية", icon: BookOpen },
    { href: "/admin/questions", label: "بنك الأسئلة", icon: Settings },
    { href: "/admin/notifications", label: "الإشعارات", icon: Bell },
    { href: "/admin/leaderboard-titles", label: "ألقاب المتصدرين", icon: Medal },
    { href: "/admin/info-cards", label: "بطاقات المعلومات", icon: CreditCard },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <div className="w-64 border-l bg-sidebar flex flex-col h-full sticky top-0 right-0">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          منصة النحو
        </h1>
        {isAdmin && <span className="text-xs text-muted-foreground mt-1 block">إدارة النظام</span>}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href || (link.href !== '/' && location.startsWith(link.href));
          
          return (
            <Link key={link.href} href={link.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}>
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => signOut()}>
          <LogOut className="w-5 h-5 ml-2" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
