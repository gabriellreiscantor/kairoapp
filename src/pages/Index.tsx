import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import MainApp from "@/pages/MainApp";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppState = 'splash' | 'loading' | 'app';

const Index = () => {
  // Sempre mostrar splash na primeira renderização
  const [appState, setAppState] = useState<AppState>('splash');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

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

  // Loading screen com fundo sólido
  if (appState === 'loading') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0a0a0c' }}
      >
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // MainApp quando usuário confirmado
  if (appState === 'app' && user) {
    return <MainApp />;
  }

  // Fallback de segurança
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0a0a0c' }}
    >
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
};

export default Index;
