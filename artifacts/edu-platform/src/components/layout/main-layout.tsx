import { ReactNode, useState } from "react";
import { Link } from "wouter";
import { AppSidebar, SidebarNavContent } from "./sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, BookOpen } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth-context";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground dir-rtl">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 p-0 dir-rtl bg-sidebar border-l border-sidebar-border">
          <SidebarNavContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Desktop header — notification bell top-left */}
        {!isAdmin && (
          <div className="hidden md:flex sticky top-0 z-40 items-center justify-start px-6 h-12 bg-background/95 backdrop-blur border-b border-border/60">
            <div className="flex items-center gap-2">
              <NotificationBell />
              <span className="text-xs text-muted-foreground">الإشعارات</span>
            </div>
          </div>
        )}

        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-background/95 backdrop-blur border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-primary">نحوي</span>
          </Link>
          {!isAdmin ? <NotificationBell /> : <div className="w-9" />}
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
