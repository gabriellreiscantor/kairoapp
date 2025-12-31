import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CallKitProvider } from "@/contexts/CallKitContext";
import FontInitializer from "@/components/FontInitializer";
import IOSWebViewConfigurator from "@/components/IOSWebViewConfigurator";
import OfflineOverlay from "./components/OfflineOverlay";
import { SystemLanguageSyncHandler } from "@/components/SystemLanguageSyncHandler";
import { remoteLog } from "@/lib/remoteLogger";

// Esconde o splash HTML imediatamente quando React monta (evita overlay invisível bloqueando cliques)
const HideSplashOnMount = () => {
  useEffect(() => {
    const initialSplash = document.getElementById('initial-splash');
    if (initialSplash) {
      initialSplash.style.display = 'none';
    }
  }, []);
  return null;
};

// Eager load - critical path
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Lazy load - Settings Pages
const CalendarSettingsPage = lazy(() => import("./pages/settings/CalendarSettingsPage"));
const NotificationSettingsPage = lazy(() => import("./pages/settings/NotificationSettingsPage"));
const SmartTasksPage = lazy(() => import("./pages/settings/SmartTasksPage"));
const SpecialFeaturesPage = lazy(() => import("./pages/settings/SpecialFeaturesPage"));
const AccountPage = lazy(() => import("./pages/settings/AccountPage"));
const AppearancePage = lazy(() => import("./pages/settings/AppearancePage"));
const LanguagePage = lazy(() => import("./pages/settings/LanguagePage"));
const HelpPage = lazy(() => import("./pages/settings/HelpPage"));
const AboutPage = lazy(() => import("./pages/settings/AboutPage"));
const MyPlanPage = lazy(() => import("./pages/settings/MyPlanPage"));
const SubscriptionPage = lazy(() => import("./pages/settings/SubscriptionPage"));

// Lazy load - Legal Pages
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const EULAPage = lazy(() => import("./pages/legal/EULAPage"));

const queryClient = new QueryClient();

// Detectar tema para o PageLoader
const getIsDarkMode = () => {
  if (typeof window === 'undefined') return true;
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') return false;
  if (savedTheme === 'dark') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Loading fallback for lazy routes - com gradiente consistente
const PageLoader = () => {
  const isDark = getIsDarkMode();
  const gradientStyle = isDark 
    ? 'linear-gradient(180deg, #4ECDC4 0%, #0a1628 100%)'
    : 'linear-gradient(180deg, #4ECDC4 0%, #f0f4f8 100%)';
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: gradientStyle }}
    >
      <div className="w-8 h-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

// Navigation logger component - tracks route changes
const NavigationLogger = () => {
  const location = useLocation();
  
  useEffect(() => {
    remoteLog.info('navigation', 'route_changed', { 
      path: location.pathname,
      search: location.search,
    });
  }, [location]);
  
  return null;
};

// Global error handlers component
const GlobalErrorHandlers = () => {
  useEffect(() => {
    // Log app started
    remoteLog.info('app_lifecycle', 'app_started', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    });

    // Handle visibility changes (foreground/background)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        remoteLog.info('app_lifecycle', 'app_background');
      } else {
        remoteLog.info('app_lifecycle', 'app_foreground');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Global error handler
    const handleError = (event: ErrorEvent) => {
      remoteLog.error('error', 'unhandled_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.substring(0, 500),
      });
    };
    window.addEventListener('error', handleError);

    // Unhandled promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      remoteLog.error('error', 'unhandled_promise_rejection', {
        reason: String(event.reason),
        stack: event.reason?.stack?.substring(0, 500),
      });
    };
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HideSplashOnMount />
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <AuthProvider>
          {/* ⚡ CallKitProvider roda IMEDIATAMENTE - antes de qualquer login */}
          <CallKitProvider>
            {/* Initialize font preference and iOS WebView config */}
            <FontInitializer />
            <IOSWebViewConfigurator />
            <GlobalErrorHandlers />
            <SystemLanguageSyncHandler />
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <OfflineOverlay />
              <BrowserRouter>
                <NavigationLogger />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<AuthPage />} />
                    
                    {/* Settings Routes */}
                    <Route path="/settings/calendars" element={<CalendarSettingsPage />} />
                    <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
                    <Route path="/settings/smart-tasks" element={<SmartTasksPage />} />
                    <Route path="/settings/features" element={<SpecialFeaturesPage />} />
                    <Route path="/settings/account" element={<AccountPage />} />
                    <Route path="/settings/appearance" element={<AppearancePage />} />
                    <Route path="/settings/language" element={<LanguagePage />} />
                    <Route path="/settings/help" element={<HelpPage />} />
                    <Route path="/settings/about" element={<AboutPage />} />
                    <Route path="/settings/plan" element={<MyPlanPage />} />
                    <Route path="/settings/subscription" element={<SubscriptionPage />} />
                    
                    {/* Legal Routes */}
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/eula" element={<EULAPage />} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </CallKitProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
