import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CallKitProvider } from "@/contexts/CallKitContext";
import FontInitializer from "@/components/FontInitializer";
import IOSWebViewConfigurator from "@/components/IOSWebViewConfigurator";
import OfflineOverlay from "./components/OfflineOverlay";

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

// Loading fallback for lazy routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <AuthProvider>
          {/* ⚡ CallKitProvider roda IMEDIATAMENTE - antes de qualquer login */}
          <CallKitProvider>
            {/* Initialize font preference and iOS WebView config */}
            <FontInitializer />
            <IOSWebViewConfigurator />
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <OfflineOverlay />
              <BrowserRouter>
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