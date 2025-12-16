import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";
import LoginScreen from "@/components/LoginScreen";
import MainApp from "@/pages/MainApp";

type AppState = 'splash' | 'login' | 'app';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('splash');

  const handleSplashComplete = () => {
    const hasLoggedIn = localStorage.getItem("kairo-logged-in");
    setAppState(hasLoggedIn ? 'app' : 'login');
  };

  const handleLogin = () => {
    localStorage.setItem("kairo-logged-in", "true");
    setAppState('app');
  };

  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <MainApp />;
};

export default Index;
