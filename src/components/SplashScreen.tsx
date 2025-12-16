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
      <div className="animate-scale-in">
        <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center">
          <FoxIcon size={72} className="text-white" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
