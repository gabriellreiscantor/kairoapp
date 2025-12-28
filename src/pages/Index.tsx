import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import MainApp from "@/pages/MainApp";
import { useAuth } from "@/contexts/AuthContext";
import { remoteLog } from "@/lib/remoteLogger";

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
  // Verificar se já mostrou o splash nessa sessão
  const hasSeenSplash = typeof window !== 'undefined' && sessionStorage.getItem('hasSeenSplash') === 'true';
  
  const [appState, setAppState] = useState<AppState>(() => {
    // Se já viu o splash nessa sessão, pula direto pro loading
    if (hasSeenSplash) return 'loading';
    return 'splash';
  });
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode] = useState(getIsDarkMode);
  
  const gradientStyle = getGradientStyle(isDarkMode);
  const dotColor = isDarkMode ? 'bg-white/60' : 'bg-gray-600/60';

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setAppState('loading');
  };

  // Fallback timeout - força transição se travar por mais de 10 segundos
  useEffect(() => {
    if (appState !== 'loading') return;
    
    const timeout = setTimeout(() => {
      remoteLog.warn('app_lifecycle', 'loading_timeout', { 
        hasUser: !!user, 
        isLoading,
        waited: '10s' 
      });
      
      // Forçar navegação se ainda travado
      if (user) {
        setAppState('app');
      } else {
        navigate('/auth');
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [appState, user, navigate, isLoading]);

  // Transição normal quando auth carrega
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

  // Loading state - pontinhos animados com background consistente
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: gradientStyle }}
    >
      <div className="flex gap-2">
        <div 
          className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`} 
          style={{ animationDuration: '0.8s' }}
        />
        <div 
          className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`} 
          style={{ animationDelay: '150ms', animationDuration: '0.8s' }}
        />
        <div 
          className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`} 
          style={{ animationDelay: '300ms', animationDuration: '0.8s' }}
        />
      </div>
    </div>
  );
};

export default Index;
