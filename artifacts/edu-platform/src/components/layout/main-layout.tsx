import { ReactNode } from "react";
import { AppSidebar } from "./sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground dir-rtl">
      <AppSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
