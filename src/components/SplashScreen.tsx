import { useEffect, useState } from "react";
import { SplashScreen as NativeSplash } from '@capacitor/splash-screen';
import splashDark from "@/assets/horah-splash-dark.png";
import splashLight from "@/assets/horah-splash-light.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  
  // Detectar tema considerando localStorage primeiro, depois sistema
  const [isDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') return false;
    if (savedTheme === 'dark') return true;
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const splashImage = isDarkMode ? splashDark : splashLight;

  // Esconder splash nativo do Capacitor IMEDIATAMENTE para evitar tela branca
  useEffect(() => {
    // Esconder o splash nativo o mais rápido possível
    NativeSplash.hide().catch(() => {
      // Silently ignore - não está rodando em ambiente nativo
    });
    
    // Delay mínimo reduzido para transição mais rápida
    const minDelayTimer = setTimeout(() => {
      setMinDelayPassed(true);
    }, 300);
    
    return () => clearTimeout(minDelayTimer);
  }, []);

  // Esconder splash inline do HTML e pré-carregar imagem
  useEffect(() => {
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

  // Só mostrar imagem quando ambos estiverem prontos
  const showImage = imageLoaded && minDelayPassed;

  useEffect(() => {
    if (!showImage) return;
    
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 400);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete, showImage]);

  // Cores de fundo que combinam com as imagens
  const bgColor = isDarkMode ? '#0a1628' : '#4ECDC4';
  const dotColor = isDarkMode ? 'bg-white/60' : 'bg-white/80';

  // Gradiente para o estado de loading inicial
  const loadingGradient = 'linear-gradient(180deg, #4ECDC4 0%, #0a1628 100%)';

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 transition-opacity duration-400 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: loadingGradient }}
    >
      {showImage ? (
        <>
          <img 
            src={splashImage} 
            alt="Horah" 
            className="w-full h-full object-cover animate-fade-in"
          />
          {/* Loading dots overlay - posicionado na parte inferior */}
          <div className="absolute bottom-24 flex gap-2">
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
        </>
      ) : (
        // Spinner circular branco
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      )}
    </div>
  );
};

export default SplashScreen;
