import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { auth } from "@/lib/firebase";
import { useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Leaderboard from "@/pages/leaderboard";
import Quiz from "@/pages/quiz";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminRules from "@/pages/admin/rules";
import AdminQuestions from "@/pages/admin/questions";
import AdminNotifications from "@/pages/admin/notifications";
import AdminLeaderboardTitles from "@/pages/admin/leaderboard-titles";
import AdminInfoCards from "@/pages/admin/info-cards";
import AdminLevels from "@/pages/admin/levels";
import Badges from "@/pages/badges";
import Exam from "@/pages/exam";

// Set token getter for all API calls
setAuthTokenGetter(async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
});

const queryClient = new QueryClient();

function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/login");
      } else if (adminOnly && !isAdmin) {
        setLocation("/");
      }
    }
  }, [user, loading, isAdmin, setLocation, adminOnly]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!user || (adminOnly && !isAdmin)) {
    return null;
  }

  return <MainLayout>{children}</MainLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <AuthGuard><Dashboard /></AuthGuard>} />
      <Route path="/leaderboard" component={() => <AuthGuard><Leaderboard /></AuthGuard>} />
      <Route path="/quiz" component={() => <AuthGuard><Quiz /></AuthGuard>} />
      
      <Route path="/admin" component={() => <AuthGuard adminOnly><AdminDashboard /></AuthGuard>} />
      <Route path="/admin/users" component={() => <AuthGuard adminOnly><AdminUsers /></AuthGuard>} />
      <Route path="/admin/rules" component={() => <AuthGuard adminOnly><AdminRules /></AuthGuard>} />
      <Route path="/admin/questions" component={() => <AuthGuard adminOnly><AdminQuestions /></AuthGuard>} />
      <Route path="/admin/notifications" component={() => <AuthGuard adminOnly><AdminNotifications /></AuthGuard>} />
      <Route path="/admin/leaderboard-titles" component={() => <AuthGuard adminOnly><AdminLeaderboardTitles /></AuthGuard>} />
      <Route path="/admin/info-cards" component={() => <AuthGuard adminOnly><AdminInfoCards /></AuthGuard>} />
      <Route path="/admin/levels" component={() => <AuthGuard adminOnly><AdminLevels /></AuthGuard>} />
      
      <Route path="/badges" component={() => <AuthGuard><Badges /></AuthGuard>} />
      <Route path="/exam/:levelId" component={() => <AuthGuard><Exam /></AuthGuard>} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
