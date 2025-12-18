import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Settings Pages
import CalendarSettingsPage from "./pages/settings/CalendarSettingsPage";
import NotificationSettingsPage from "./pages/settings/NotificationSettingsPage";
import SmartTasksPage from "./pages/settings/SmartTasksPage";
import SpecialFeaturesPage from "./pages/settings/SpecialFeaturesPage";
import AccountPage from "./pages/settings/AccountPage";
import AppearancePage from "./pages/settings/AppearancePage";
import LanguagePage from "./pages/settings/LanguagePage";
import HelpPage from "./pages/settings/HelpPage";
import AboutPage from "./pages/settings/AboutPage";
import MyPlanPage from "./pages/settings/MyPlanPage";
import SubscriptionPage from "./pages/settings/SubscriptionPage";

// Legal Pages
import TermsPage from "./pages/legal/TermsPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import EULAPage from "./pages/legal/EULAPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
