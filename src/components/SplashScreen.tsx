import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import horahLogoLight from "@/assets/horah-splash-light.png";
import horahLogoDark from "@/assets/horah-splash-dark.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Fallback enquanto o tema não está resolvido
  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0c] flex items-center justify-center z-50">
        <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
      </div>
    );
  }

  // Usar dark como fallback se theme não estiver resolvido
  const isDark = resolvedTheme === 'dark' || resolvedTheme === undefined;
  const logoSrc = isDark ? horahLogoDark : horahLogoLight;

  return (
    <div
      className={`fixed inset-0 bg-background flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="animate-scale-in flex flex-col items-center gap-6">
        <img 
          src={logoSrc} 
          alt="Horah" 
          className="w-32 h-32 rounded-3xl shadow-2xl"
        />
        <h1 className="text-3xl font-bold text-foreground tracking-wide">
          Horah
        </h1>
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    </div>
  );
};

export default SplashScreen;
