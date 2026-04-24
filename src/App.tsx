import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { BlockInsertProvider } from "@/contexts/BlockInsertContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OfflineSyncProvider } from "@/contexts/OfflineSyncContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { FloatingAskAnything } from "@/components/FloatingAskAnything";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { LandingPage } from "@/pages/LandingPage";
import { Login } from "@/pages/Login";
import { PublicPageViewer } from "@/pages/PublicPageViewer";
import { PricingPage } from "@/pages/PricingPage";
import { AboutPage } from "@/pages/AboutPage";
import { ContactPage } from "@/pages/ContactPage";
import { TermsPage } from "@/pages/TermsPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { AskAnything } from "@/pages/AskAnything";
import { HomePage } from "@/pages/HomePage";
import { PagesPage } from "@/pages/PagesPage";
import { PageViewer } from "@/pages/PageViewer";
import { PageEditor } from "@/pages/PageEditor";
import { DatabasePage } from "@/pages/DatabasePage";
import { SkillsPage } from "@/pages/SkillsPage";
import { TasksPage } from "@/pages/TasksPage";
import { EnhancedGraphPage } from "@/pages/EnhancedGraphPage";
import { CalendarPage } from "@/pages/CalendarPage";
import TrashPage from "@/pages/TrashPage";
import "@/styles/scrollbar.css";
import "@/styles/responsive.css";
import { SettingsPage } from "@/pages/SettingsPage";
import { QuizPage } from "@/pages/QuizPage";
import { FlashcardsPage } from "@/pages/FlashcardsPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import { InvitationPage } from "@/pages/InvitationPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ActivityPage } from "@/pages/ActivityPage";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { handleAuthError } from "@/lib/auth-error-handler";
import { syncManager } from "@/lib/sync-manager";
import "@/lib/clear-auth"; // Auto-clear invalid auth

// Component to conditionally show FloatingAskAnything (only after login)
function ConditionalFloatingAskAnything() {
  const location = useLocation();
  
  // Hide on public pages (landing, login, public page viewer)
  const publicPaths = ['/', '/login'];
  const isPublicPage = publicPaths.includes(location.pathname) || location.pathname.startsWith('/public/');
  
  // Hide on Ask Anything page and Settings page
  const hideOnPaths = ['/ask', '/settings'];
  const shouldHide = hideOnPaths.some(path => 
    location.pathname === path || 
    location.pathname.includes('/workspace/') && location.pathname.endsWith(path.replace('/', ''))
  );
  
  if (isPublicPage || shouldHide) return null;
  
  return <FloatingAskAnything />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.message?.includes('Refresh Token') || error?.status === 400) {
          return false;
        }
        return failureCount < 3;
      },
      onError: (error: any) => {
        handleAuthError(error);
      }
    },
    mutations: {
      onError: (error: any) => {
        handleAuthError(error);
      }
    }
  }
});

// Global auth state listener
function AuthErrorHandler() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        syncManager.stop();
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'SIGNED_IN') {
        console.log('User signed in, starting sync manager');
        syncManager.start();
      }
    });

    // Start sync manager if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        syncManager.start();
      }
    });

    return () => {
      subscription.unsubscribe();
      syncManager.stop();
    };
  }, []);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthErrorHandler />
          <AuthProvider>
            <OfflineSyncProvider>
            <WorkspaceProvider>
            <BlockInsertProvider>
            <ConditionalFloatingAskAnything />
            <Routes>
              {/* ========== PUBLIC ROUTES ========== */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              
              {/* Public Page Viewer - No authentication required */}
              <Route path="/public/page/:pageId" element={<PublicPageViewer />} />
              
              {/* Invitation acceptance page */}
              <Route
                path="/invitation/:token"
                element={
                  <ProtectedRoute>
                    <InvitationPage />
                  </ProtectedRoute>
                }
              />
              
              {/* ========== WORKSPACE-SCOPED ROUTES (Primary) ========== */}
              {/* Home & Dashboard */}
              <Route
                path="/workspace/:workspaceId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <HomePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* AI Assistant */}
              <Route
                path="/workspace/:workspaceId/ask"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AskAnything />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Pages System */}
              <Route
                path="/workspace/:workspaceId/pages"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PagesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:workspaceId/pages/new"
                element={
                  <ProtectedRoute>
                    <PageEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:workspaceId/pages/:pageId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageViewer />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:workspaceId/pages/:pageId/edit"
                element={
                  <ProtectedRoute>
                    <PageEditor />
                  </ProtectedRoute>
                }
              />
              
              {/* Database Pages (Special page type) */}
              <Route
                path="/workspace/:workspaceId/database/:pageId"
                element={
                  <ProtectedRoute>
                    <DatabasePage />
                  </ProtectedRoute>
                }
              />
              
              {/* Skills & Tasks */}
              <Route
                path="/workspace/:workspaceId/skills"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SkillsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:workspaceId/tasks"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TasksPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Knowledge Graph */}
              <Route
                path="/workspace/:workspaceId/graph"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <EnhancedGraphPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Calendar */}
              <Route
                path="/workspace/:workspaceId/calendar"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CalendarPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Trash/Bin */}
              <Route
                path="/workspace/:workspaceId/trash"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TrashPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Learning Objects - Quiz and Flashcards */}
              <Route
                path="/workspace/:workspaceId/quiz/:quizId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <QuizPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:workspaceId/flashcards/:deckId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <FlashcardsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Notifications */}
              <Route
                path="/workspace/:workspaceId/notifications"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NotificationsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Activity History */}
              <Route
                path="/workspace/:workspaceId/activity"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ActivityPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Settings & Subscription */}
              <Route
                path="/workspace/:workspaceId/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SettingsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:workspaceId/subscription"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SubscriptionPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* ========== LEGACY ROUTES (Backward Compatibility) ========== */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <HomePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ask"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AskAnything />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PagesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages/:pageId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageViewer />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages/:pageId/edit"
                element={
                  <ProtectedRoute>
                    <PageEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/database/:pageId"
                element={
                  <ProtectedRoute>
                    <DatabasePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skills"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SkillsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TasksPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/graph"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <EnhancedGraphPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CalendarPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trash"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TrashPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SettingsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SubscriptionPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NotificationsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ActivityPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/:quizId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <QuizPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/flashcards/:deckId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <FlashcardsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* ========== 404 NOT FOUND ========== */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <PWAInstallPrompt />
          </BlockInsertProvider>
          </WorkspaceProvider>
          </OfflineSyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
