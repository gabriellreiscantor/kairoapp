import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import MainApp from "@/pages/MainApp";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppState = 'splash' | 'loading' | 'app';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('splash');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Detectar tema do sistema
  const [isDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const handleSplashComplete = () => {
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

  // Gradientes consistentes com o splash
  const gradientStyle = isDarkMode 
    ? 'linear-gradient(160deg, hsl(240 10% 4%) 0%, hsl(220 40% 10%) 40%, hsl(220 35% 18%) 70%, hsl(240 10% 4%) 100%)'
    : 'linear-gradient(160deg, hsl(0 0% 100%) 0%, hsl(210 40% 96%) 40%, hsl(214 60% 95%) 70%, hsl(0 0% 100%) 100%)';

  const loaderColor = isDarkMode ? 'text-white/50' : 'text-gray-400';

  if (appState === 'loading') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: gradientStyle }}
      >
        <Loader2 className={`w-8 h-8 ${loaderColor} animate-spin`} />
      </div>
    );
  }

  if (appState === 'app' && user) {
    return <MainApp />;
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: gradientStyle }}
    >
      <Loader2 className={`w-8 h-8 ${loaderColor} animate-spin`} />
    </div>
  );
};

export default Index;
