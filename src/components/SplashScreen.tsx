import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import horahLogoDark from "@/assets/horah-splash-dark.png";
import horahLogoLight from "@/assets/horah-splash-light.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Detectar tema considerando localStorage primeiro, depois sistema
  const [isDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    
    // Primeiro verificar localStorage (preferência do usuário no app)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') return false;
    if (savedTheme === 'dark') return true;
    
    // Fallback para preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const splashImage = isDarkMode ? horahLogoLight : horahLogoDark;

  // Esconder splash inline do HTML e pré-carregar imagem
  useEffect(() => {
    // Esconder o splash inline imediatamente
    const initialSplash = document.getElementById('initial-splash');
    if (initialSplash) {
      initialSplash.style.display = 'none';
    }
    
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true);
    img.src = splashImage;
    
    const fallbackTimer = setTimeout(() => {
      setImageLoaded(true);
    }, 1000);
    
    return () => clearTimeout(fallbackTimer);
  }, [splashImage]);

  useEffect(() => {
    if (!imageLoaded) return;
    
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 400);
    }, 1800);

    return () => clearTimeout(timer);
  }, [onComplete, imageLoaded]);

  // Gradientes dinâmicos para cada tema
  const gradientStyle = isDarkMode 
    ? 'linear-gradient(160deg, hsl(240 10% 4%) 0%, hsl(220 40% 10%) 40%, hsl(220 35% 18%) 70%, hsl(240 10% 4%) 100%)'
    : 'linear-gradient(160deg, hsl(0 0% 100%) 0%, hsl(210 40% 96%) 40%, hsl(214 60% 95%) 70%, hsl(0 0% 100%) 100%)';

  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const loaderColor = isDarkMode ? 'text-white/50' : 'text-gray-400';

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 transition-opacity duration-400 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: gradientStyle }}
    >
      {imageLoaded ? (
        <div className="animate-scale-in flex flex-col items-center gap-6">
          <img 
            src={splashImage} 
            alt="Horah" 
            className="w-32 h-32 rounded-3xl shadow-2xl"
          />
          <h1 className={`text-3xl font-bold ${textColor} tracking-wide`}>
            Horah
          </h1>
          <Loader2 className={`w-6 h-6 ${loaderColor} animate-spin`} />
        </div>
      ) : (
        <Loader2 className={`w-6 h-6 ${loaderColor} animate-spin`} />
      )}
    </div>
  );
};

export default SplashScreen;
