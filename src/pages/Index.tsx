import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import MainApp from "@/pages/MainApp";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppState = 'splash' | 'loading' | 'app';

const Index = () => {
  // Verificar se splash já foi mostrado NESTA SESSÃO (sessionStorage limpa ao fechar app)
  const hasSeenSplash = sessionStorage.getItem('horah_splash_seen') === 'true';
  
  const [appState, setAppState] = useState<AppState>(hasSeenSplash ? 'loading' : 'splash');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSplashComplete = () => {
    sessionStorage.setItem('horah_splash_seen', 'true');
    setAppState('loading');
  };

  useEffect(() => {
    if (appState === 'loading' && !isLoading) {
      if (user) {
        setAppState('app');
      } else {
        navigate('/auth');
      }
    }
  }, [appState, isLoading, user, navigate]);

  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appState === 'loading' && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <MainApp />;
};

export default Index;
