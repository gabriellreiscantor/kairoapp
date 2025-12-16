import { useEffect, useState } from "react";
import FoxIcon from "./icons/FoxIcon";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 bg-background flex items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-up">
        <div className="animate-pulse-soft">
          <FoxIcon size={100} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Kairo
        </h1>
      </div>
    </div>
  );
};

export default SplashScreen;
