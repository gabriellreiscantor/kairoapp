import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import MainApp from "@/pages/MainApp";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppState = 'splash' | 'loading' | 'app';

// Detectar tema uma vez no início
const getIsDarkMode = () => {
  if (typeof window === 'undefined') return true;
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') return false;
  if (savedTheme === 'dark') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Gradiente consistente com o splash nativo
const getGradientStyle = (isDark: boolean) => isDark 
  ? 'linear-gradient(180deg, #4ECDC4 0%, #0a1628 100%)'
  : 'linear-gradient(180deg, #4ECDC4 0%, #f0f4f8 100%)';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('splash');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode] = useState(getIsDarkMode);
  
  const gradientStyle = getGradientStyle(isDarkMode);
  const loaderColor = isDarkMode ? 'text-white/60' : 'text-gray-500';

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

  // Splash screen - componente próprio
  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // App carregado - MainApp
  if (appState === 'app' && user) {
    return <MainApp />;
  }

  // Loading state - sempre mostra spinner com background consistente
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: gradientStyle }}
    >
      <Loader2 className={`w-8 h-8 ${loaderColor} animate-spin`} />
    </div>
  );
};

export default Index;
