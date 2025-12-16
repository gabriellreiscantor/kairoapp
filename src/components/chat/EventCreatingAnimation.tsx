import { CalendarCheck, Check, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

interface EventCreatingAnimationProps {
  onComplete?: () => void;
}

const steps = [
  { icon: Clock, text: "Verificando agenda..." },
  { icon: MapPin, text: "Organizando detalhes..." },
  { icon: CalendarCheck, text: "Finalizando..." },
];

const EventCreatingAnimation = ({ onComplete }: EventCreatingAnimationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const stepDuration = 600;
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stepDuration);

    // Complete animation after all steps
    const timeout = setTimeout(() => {
      setIsComplete(true);
      setTimeout(() => {
        onComplete?.();
      }, 400);
    }, stepDuration * steps.length);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-kairo-surface-2 rounded-2xl border border-primary/20 animate-fade-in">
      {/* Animated icon */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        {isComplete ? (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-scale-in">
            <Check className="w-5 h-5 text-primary" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-primary animate-pulse" />
          </div>
        )}
      </div>

      {/* Text and progress */}
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {isComplete ? "Pronto!" : steps[currentStep].text}
        </p>
        
        {/* Progress dots */}
        <div className="flex gap-1.5 mt-1.5">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx <= currentStep
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventCreatingAnimation;
