import { Crown, MessageSquare, Infinity, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { useLanguage } from "@/contexts/LanguageContext";

const SpecialFeaturesPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const FEATURES = [
    {
      icon: MessageSquare,
      titleKey: "premium.whatsappUnlimited",
      descKey: "premium.whatsappUnlimitedDesc",
      premium: true,
    },
    {
      icon: Infinity,
      titleKey: "premium.eventsUnlimited",
      descKey: "premium.eventsUnlimitedDesc",
      premium: true,
    },
    {
      icon: Clock,
      titleKey: "premium.criticalAlerts",
      descKey: "premium.criticalAlertsDesc",
      premium: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">{t('premium.title')}</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Premium Banner */}
        <div className="gradient-plan rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-7 h-7 text-white" />
            <div>
              <h2 className="text-white font-bold text-lg">{t('premium.banner')}</h2>
              <p className="text-white/70 text-sm">{t('premium.bannerDesc')}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/settings/plan?from=settings')}
            className="w-full py-3 rounded-xl bg-white text-primary font-semibold active:scale-95 transition-transform"
          >
            {t('premium.upgradeNow')}
          </button>
        </div>

        {/* Features List */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {t('premium.title')}
          </h2>
          <div className="space-y-3">
            {FEATURES.map((feature, index) => (
              <div 
                key={index}
                className="bg-kairo-surface-2 rounded-2xl p-4 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-foreground font-semibold">{t(feature.titleKey)}</h3>
                    {feature.premium && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        {t('common.premium')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Free vs Premium Comparison */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {t('premium.comparison')}
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 px-4 py-3 border-b border-border/10">
              <span className="text-muted-foreground text-sm">{t('premium.feature')}</span>
              <span className="text-muted-foreground text-sm text-center">{t('premium.free')}</span>
              <span className="text-primary text-sm text-center font-medium">{t('common.premium')}</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 border-b border-border/10">
              <span className="text-foreground text-sm">{t('common.events')}</span>
              <span className="text-muted-foreground text-sm text-center">14</span>
              <span className="text-foreground text-sm text-center">∞</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 border-b border-border/10">
              <span className="text-foreground text-sm">WhatsApp</span>
              <span className="text-muted-foreground text-sm text-center">5</span>
              <span className="text-foreground text-sm text-center">∞</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 border-b border-border/10">
              <span className="text-foreground text-sm">{t('notifications.callMe')}</span>
              <span className="text-foreground text-sm text-center">✓</span>
              <span className="text-foreground text-sm text-center">✓</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3">
              <span className="text-foreground text-sm">{t('premium.criticalAlerts')}</span>
              <span className="text-muted-foreground text-sm text-center">—</span>
              <span className="text-foreground text-sm text-center">✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialFeaturesPage;