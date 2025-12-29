import { Bell, Phone, MessageSquare, Volume2, Crown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import BackButton from "@/components/BackButton";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const NotificationSettingsPage = () => {
  const { preferences, isLoading, updatePreference } = useNotificationPreferences();
  const { limits, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const hasCriticalAlerts = limits?.has_critical_alerts ?? false;

  const handleToggle = async (
    key: keyof typeof preferences,
    value: boolean
  ) => {
    const success = await updatePreference(key, value);
    if (!success) {
      toast.error(t('notifications.saveError'));
    }
  };

  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
          <BackButton />
          <h1 className="text-xl font-bold text-foreground">{t('notifications.title')}</h1>
        </header>
        <div className="px-4 pb-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">{t('notifications.title')}</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Notification Channels */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {t('notifications.channels')}
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">{t('notifications.push')}</p>
                  <p className="text-xs text-muted-foreground">{t('notifications.pushDesc')}</p>
                </div>
              </div>
              <Switch 
                checked={preferences.push_enabled} 
                onCheckedChange={(v) => handleToggle("push_enabled", v)} 
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">{t('notifications.callMe')}</p>
                  <p className="text-xs text-muted-foreground">{t('notifications.callMeDesc')}</p>
                </div>
              </div>
              <Switch 
                checked={preferences.call_enabled} 
                onCheckedChange={(v) => handleToggle("call_enabled", v)} 
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">{t('notifications.whatsapp')}</p>
                  <p className="text-xs text-muted-foreground">{t('notifications.whatsappDesc')}</p>
                </div>
              </div>
              <Switch 
                checked={preferences.whatsapp_enabled} 
                onCheckedChange={(v) => handleToggle("whatsapp_enabled", v)} 
              />
            </div>
          </div>
        </div>

        {/* Sound & Vibration */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {t('notifications.soundVibration')}
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">{t('notifications.sound')}</span>
              </div>
              <Switch 
                checked={preferences.sound_enabled} 
                onCheckedChange={(v) => handleToggle("sound_enabled", v)} 
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="w-3 h-4 border-2 border-muted-foreground rounded-sm" />
                </div>
                <span className="text-foreground">{t('notifications.vibration')}</span>
              </div>
              <Switch 
                checked={preferences.vibration_enabled} 
                onCheckedChange={(v) => handleToggle("vibration_enabled", v)} 
              />
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <h2 className="text-xs text-muted-foreground uppercase tracking-wider">
              {t('notifications.criticalAlerts')}
            </h2>
            {!hasCriticalAlerts && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">
                <Crown className="w-2.5 h-2.5 mr-0.5" />
                {t('common.premium')}
              </Badge>
            )}
          </div>
          <div className={`bg-kairo-surface-2 rounded-2xl overflow-hidden ${!hasCriticalAlerts ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex-1 mr-3">
                <p className="text-foreground">{t('notifications.ignoreSilent')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('notifications.ignoreSilentDesc')}
                </p>
              </div>
              <Switch 
                checked={preferences.critical_alerts_enabled} 
                onCheckedChange={(v) => handleToggle("critical_alerts_enabled", v)}
                disabled={!hasCriticalAlerts}
              />
            </div>
          </div>
          {hasCriticalAlerts ? (
            <p className="text-xs text-muted-foreground mt-2 px-1">
              {t('notifications.criticalExplain')}
            </p>
          ) : (
            <button 
              onClick={() => navigate('/settings/my-plan')}
              className="w-full mt-3 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              {t('notifications.upgradeUnlock')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;