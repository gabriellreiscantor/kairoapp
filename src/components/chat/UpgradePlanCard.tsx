import React from "react";
import { Sparkles, Calendar, ArrowRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface UpgradePlanCardProps {
  limitData: {
    currentPlan: string;
    eventsUsed: number;
    eventsLimit: number;
    daysUntilReset: number;
  };
  onDismiss?: () => void;
}

const UpgradePlanCard = React.forwardRef<HTMLDivElement, UpgradePlanCardProps>(
  ({ limitData, onDismiss }, ref) => {
    const navigate = useNavigate();

    if (!limitData) {
      return null;
    }

    const { currentPlan, eventsUsed, eventsLimit, daysUntilReset } = limitData;
    
    const planDisplayName = currentPlan === 'free' ? 'grátis' : currentPlan.toUpperCase();

    const handleUpgrade = () => {
      navigate('/settings/my-plan');
    };

    return (
      <div
        ref={ref}
        className="bg-gradient-to-br from-[#1F5BFF]/10 via-[#39B7E5]/10 to-[#63E0A3]/10 border border-[#39B7E5]/30 rounded-2xl p-4 max-w-[320px] animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium bg-gradient-to-r from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3] bg-clip-text text-transparent">
            Limite atingido
          </span>
        </div>

        {/* Usage info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              Você usou <span className="font-semibold">{eventsUsed}/{eventsLimit}</span> eventos
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              Plano {planDisplayName} • Reseta em {daysUntilReset} dia{daysUntilReset > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3] rounded-full transition-all duration-300"
            style={{ width: '100%' }}
          />
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3] text-white hover:opacity-90 transition-opacity"
        >
          <span>Atualizar para Plus</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Secondary action */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-2"
          >
            Esperar o limite resetar
          </button>
        )}

        {/* Info text */}
        <p className="text-xs text-muted-foreground leading-relaxed mt-3 text-center">
          Com o Plus você cria até 50 eventos por semana!
        </p>
      </div>
    );
  }
);

UpgradePlanCard.displayName = "UpgradePlanCard";

export default UpgradePlanCard;
