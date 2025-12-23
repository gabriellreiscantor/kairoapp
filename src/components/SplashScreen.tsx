import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import horahLogoDark from "@/assets/horah-splash-dark.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Pré-carregar a imagem imediatamente
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true); // Continuar mesmo se falhar
    img.src = horahLogoDark;
    
    // Fallback: se a imagem não carregar em 1s, continua mesmo assim
    const fallbackTimer = setTimeout(() => {
      setImageLoaded(true);
    }, 1000);
    
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    // Só inicia o timer quando a imagem estiver carregada
    if (!imageLoaded) return;
    
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 400);
    }, 1800);

    return () => clearTimeout(timer);
  }, [onComplete, imageLoaded]);

  // Background sólido enquanto carrega
  const bgColor = "#0a0a0c";

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 transition-opacity duration-400 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: bgColor }}
    >
      {imageLoaded ? (
        <div className="animate-scale-in flex flex-col items-center gap-6">
          <img 
            src={horahLogoDark} 
            alt="Horah" 
            className="w-32 h-32 rounded-3xl shadow-2xl"
          />
          <h1 className="text-3xl font-bold text-white tracking-wide">
            Horah
          </h1>
          <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
        </div>
      ) : (
        <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
      )}
    </div>
  );
};

export default SplashScreen;
