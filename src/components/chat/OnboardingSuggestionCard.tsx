import { Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingSuggestionCardProps {
  type: 'weekly_planning' | 'connect_calendar';
  onAccept: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const OnboardingSuggestionCard = ({ 
  type, 
  onAccept, 
  onSkip, 
  isLoading 
}: OnboardingSuggestionCardProps) => {
  const content = {
    weekly_planning: {
      icon: "📅",
      title: "Planejamento semanal",
      description: "Toda segunda-feira, o Kairo pode reservar 30 minutos para você planejar a semana e definir suas metas. É um pequeno hábito para uma vida mais tranquila.",
      acceptText: "Criar lembrete",
      skipText: "Agora não",
    },
    connect_calendar: {
      icon: "🔗",
      title: "Conectar calendários",
      description: "Para uma experiência ainda melhor, você pode conectar seu calendário para manter tudo sincronizado.",
      acceptText: "Conectar",
      skipText: "Pular",
    },
  };

  const { icon, title, description, acceptText, skipText } = content[type];

  return (
    <div className="bg-gradient-to-br from-kairo-surface-2 to-kairo-surface-3 border border-primary/20 rounded-2xl p-4 max-w-[320px] animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground text-sm">{title}</h4>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        {description}
      </p>

      {type === 'connect_calendar' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-border/20 rounded-lg px-3 py-2 text-xs transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            Google
          </button>
          <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-border/20 rounded-lg px-3 py-2 text-xs transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            Apple
          </button>
          <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-border/20 rounded-lg px-3 py-2 text-xs transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            Outlook
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          onClick={onAccept}
          disabled={isLoading}
          size="sm"
          className="flex-1 kairo-button-primary text-xs h-9"
        >
          <Check className="w-3.5 h-3.5 mr-1.5" />
          {acceptText}
        </Button>
        <Button
          onClick={onSkip}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="text-xs h-9 text-muted-foreground hover:text-foreground"
        >
          {skipText}
        </Button>
      </div>
    </div>
  );
};

export default OnboardingSuggestionCard;
