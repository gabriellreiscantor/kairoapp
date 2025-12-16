import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";
import Onboarding from "@/components/Onboarding";
import HomePage from "./HomePage";
import HistoryPage from "./HistoryPage";
import WhatsAppPage from "./WhatsAppPage";
import SettingsPage from "./SettingsPage";
import BottomNav from "@/components/BottomNav";

type AppState = "splash" | "onboarding" | "app";
type Tab = "home" | "history" | "whatsapp" | "settings";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("splash");
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Check if user has completed onboarding
  useEffect(() => {
    const hasOnboarded = localStorage.getItem("kairo-onboarded");
    if (hasOnboarded) {
      setAppState("app");
    }
  }, []);

  const handleSplashComplete = () => {
    const hasOnboarded = localStorage.getItem("kairo-onboarded");
    setAppState(hasOnboarded ? "app" : "onboarding");
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem("kairo-onboarded", "true");
    setAppState("app");
  };

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomePage />;
      case "history":
        return <HistoryPage />;
      case "whatsapp":
        return <WhatsAppPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {appState === "splash" && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {appState === "onboarding" && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {appState === "app" && (
        <>
          {renderTab()}
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}
    </div>
  );
};

export default Index;
