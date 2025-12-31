import React from "react";
import { Sparkles, Calendar, ArrowRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

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
    const { t, language } = useLanguage();

    if (!limitData) {
      return null;
    }

    const { currentPlan, eventsUsed, eventsLimit, daysUntilReset } = limitData;
    
    const planDisplayName = currentPlan === 'free' 
      ? (t('upgrade.freePlan') || 'Free plan')
      : currentPlan.toUpperCase();

    const handleUpgrade = () => {
      navigate('/settings/my-plan');
    };

    // Build events used text
    const eventsUsedText = (t('upgrade.eventsUsed') || 'You used {used}/{limit} events this week')
      .replace('{used}', String(eventsUsed))
      .replace('{limit}', String(eventsLimit));

    // Build resets in text
    const resetsInText = (t('upgrade.resetsIn') || 'Resets in {days} days')
      .replace('{days}', String(daysUntilReset));

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
            {t('upgrade.limitReached') || "Limit Reached"}
          </span>
        </div>

        {/* Usage info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {eventsUsedText}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {planDisplayName} • {resetsInText}
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
          <span>{t('upgrade.upgradeToPlus') || "Upgrade to Plus"}</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Secondary action */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-2"
          >
            {t('upgrade.waitForReset') || "Wait for Limit Reset"}
          </button>
        )}
      </div>
    );
  }
);

UpgradePlanCard.displayName = "UpgradePlanCard";

export default UpgradePlanCard;
