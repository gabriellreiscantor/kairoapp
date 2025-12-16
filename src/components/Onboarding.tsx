import { useState } from "react";
import { Button } from "@/components/ui/button";
import FoxIcon from "./icons/FoxIcon";
import { Clock, MessageCircle, Bell } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const OnboardingStep = ({
  icon,
  title,
  description,
  isActive,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive: boolean;
}) => (
  <div
    className={`flex flex-col items-center text-center px-8 transition-all duration-500 ${
      isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 absolute"
    }`}
  >
    <div className="mb-8 p-6 rounded-full bg-kairo-surface2">
      {icon}
    </div>
    <h2 className="text-2xl font-semibold text-foreground mb-4">{title}</h2>
    <p className="text-muted-foreground text-lg leading-relaxed max-w-xs">
      {description}
    </p>
  </div>
);

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <FoxIcon size={80} />,
      title: "Kairo cuida do seu tempo",
      description:
        "Nunca mais esqueça um compromisso. Kairo te lembra no momento certo, do jeito certo.",
    },
    {
      icon: <MessageCircle size={64} className="text-primary" />,
      title: "WhatsApp integrado",
      description:
        "Crie eventos direto pelo WhatsApp. Basta mandar uma mensagem como 'Reunião amanhã às 15h'.",
    },
    {
      icon: <Bell size={64} className="text-primary" />,
      title: "Alertas que funcionam",
      description:
        "Notificações inteligentes que realmente chamam sua atenção quando importa.",
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col justify-between py-12 px-6 z-40">
      {/* Skip button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          Pular
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative">
        {steps.map((s, index) => (
          <OnboardingStep
            key={index}
            icon={s.icon}
            title={s.title}
            description={s.description}
            isActive={step === index}
          />
        ))}
      </div>

      {/* Progress and button */}
      <div className="flex flex-col items-center gap-8">
        {/* Progress dots */}
        <div className="flex gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === step
                  ? "w-8 bg-primary"
                  : index < step
                  ? "w-2 bg-primary/50"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleNext}
          className="w-full max-w-xs kairo-button-primary text-lg py-6"
        >
          {step === steps.length - 1 ? "Começar" : "Continuar"}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
