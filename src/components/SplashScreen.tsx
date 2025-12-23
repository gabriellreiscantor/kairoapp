import { useEffect, useState } from "react";
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

  const glowColor = isDarkMode 
    ? 'from-orange-500/25 to-amber-400/15' 
    : 'from-orange-400/20 to-amber-300/10';

  const dotColor = isDarkMode ? 'bg-white/50' : 'bg-gray-400/60';

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 transition-opacity duration-400 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: gradientStyle }}
    >
      {imageLoaded ? (
        <div className="flex flex-col items-center">
          {/* Logo com glow */}
          <div className="relative animate-fade-in">
            {/* Glow effect */}
            <div 
              className={`absolute inset-0 bg-gradient-to-br ${glowColor} blur-3xl rounded-full scale-150 opacity-80`} 
            />
            <img 
              src={splashImage} 
              alt="Horah" 
              className="relative w-40 h-40 rounded-[2rem] shadow-2xl"
            />
          </div>
          
          {/* Título elegante */}
          <h1 
            className={`mt-5 text-4xl font-semibold ${textColor} tracking-[0.15em] uppercase animate-fade-in`}
            style={{ animationDelay: '150ms', animationFillMode: 'both' }}
          >
            Horah
          </h1>
          
          {/* Pontinhos animados */}
          <div 
            className="flex gap-2 mt-10 animate-fade-in"
            style={{ animationDelay: '300ms', animationFillMode: 'both' }}
          >
            <div 
              className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`}
              style={{ animationDelay: '0ms' }}
            />
            <div 
              className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`}
              style={{ animationDelay: '150ms' }}
            />
            <div 
              className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`}
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`} />
          <div className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`} style={{ animationDelay: '150ms' }} />
          <div className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`} style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
