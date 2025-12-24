import { X, ChevronRight, Calendar, Bell, Sparkles, Zap, User, Globe, MessageCircle, Info, LogOut, Sun, Moon, Loader2, Crown, CreditCard } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import defaultAvatar from "@/assets/default-avatar.png";
interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  showArrow?: boolean;
}

const SettingItem = ({ icon, iconColor, label, value, onClick, danger, showArrow = true }: SettingItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between py-3 group transition-colors"
  >
    <div className="flex items-center gap-3">
      <div 
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          danger 
            ? "bg-red-500/10 text-red-500" 
            : iconColor || "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        }`}
      >
        {icon}
      </div>
      <span className={`font-medium ${danger ? "text-red-500" : "text-foreground"}`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      {showArrow && <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${danger ? "text-red-500/50" : "text-muted-foreground/40"}`} />}
    </div>
  </button>
);

const LANGUAGE_NAMES: Record<string, string> = {
  'pt-BR': 'Português',
  'en-US': 'English',
  'es-ES': 'Español',
  'fr-FR': 'Français',
  'de-DE': 'Deutsch',
  'it-IT': 'Italiano',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'zh-CN': '中文',
};

const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const { subscription, limits, usedEvents, loading: subscriptionLoading } = useSubscription();
  const { theme } = useTheme();

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free': return t('plan.free');
      case 'plus': return t('plan.plus');
      case 'super': return t('plan.super');
      default: return plan;
    }
  };

  const getThemeLabel = (currentTheme: string | undefined) => {
    switch (currentTheme) {
      case 'light': return t('appearance.light');
      case 'dark': return t('appearance.dark');
      case 'system':
      default: return t('settings.system');
    }
  };
  
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const currentPlan = subscription?.plan || 'free';
  const maxEvents = limits?.max_events_per_week || 14;
  const progress = maxEvents > 0 ? (usedEvents / maxEvents) * 100 : 0;

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    if (isOpen) {
      fetchProfile();
    }
  }, [user, isOpen]);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(`${path}?from=settings`);
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
    navigate('/auth');
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const displayEmail = user?.email || '';

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-background border-border/10 max-h-[92vh]" aria-describedby="settings-description">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{t('settings.title')}</DrawerTitle>
          <DrawerDescription id="settings-description">
            {t('settings.title')}
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto hide-scrollbar">
          {/* Close Button */}
          <div className="flex justify-end px-5 pt-1">
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* User Profile - Premium Header */}
          <div className="px-5 py-6 flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3] p-[3px]">
                <div className="w-full h-full rounded-full bg-background overflow-hidden">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={defaultAvatar} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
              {/* Edit badge */}
              <button 
                onClick={() => handleNavigate('/settings/account')}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            
            {profileLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-4" />
            ) : (
              <div className="mt-4 text-center">
                <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{displayEmail}</p>
              </div>
            )}
          </div>

          {/* Plan Card - Kairo Colors */}
          <div className="px-5 pb-6">
            <button 
              onClick={() => handleNavigate('/settings/plan')}
              className="w-full rounded-2xl p-4 relative overflow-hidden gradient-gold shadow-xl"
              style={{
                boxShadow: '0 8px 32px rgba(31, 91, 255, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
              }}
            >
              {/* Animated glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10" />
              <div className="absolute -inset-1 gradient-gold opacity-30 blur-xl" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-lg drop-shadow-md">{getPlanLabel(currentPlan)}</p>
                    <p className="text-white/80 text-xs">{t('plan.eventsScheduled')}</p>
                  </div>
                </div>
                <button 
                  className="px-4 py-2.5 rounded-full bg-white text-gray-900 text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/50"
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('/settings/plan');
                  }}
                >
                  {currentPlan === 'free' ? t('plan.upgradeNow') : t('plan.manage')}
                </button>
              </div>
              
              <div className="relative flex items-center justify-between mt-4">
                <div className="flex-1 mr-4">
                  <div className="h-2.5 bg-white/25 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {subscriptionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                  ) : (
                    <>
                      <span className="text-white font-bold text-lg drop-shadow-md">{usedEvents}</span>
                      <span className="text-white/70 text-sm">/ {maxEvents}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Settings Sections - Clean Design */}
          <div className="px-5 space-y-6 pb-6">
            {/* Kairo Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3]" />
                {t('settings.kairo')}
              </h4>
              <div className="space-y-1">
              <SettingItem 
                  icon={<Calendar className="w-4.5 h-4.5" />}
                  iconColor="bg-blue-500/10 text-blue-500"
                  label={t('settings.calendars')}
                  value="Horah"
                  onClick={() => handleNavigate('/settings/calendars')}
                />
                <SettingItem 
                  icon={<Bell className="w-4.5 h-4.5" />}
                  iconColor="bg-amber-500/10 text-amber-500"
                  label={t('settings.notifications')}
                  onClick={() => handleNavigate('/settings/notifications')}
                />
                <SettingItem 
                  icon={<Sparkles className="w-4.5 h-4.5" />}
                  iconColor="bg-purple-500/10 text-purple-500"
                  label={t('settings.smartTasks')}
                  onClick={() => handleNavigate('/settings/smart-tasks')}
                />
                <SettingItem 
                  icon={<Zap className="w-4.5 h-4.5" />}
                  iconColor="bg-kairo-orange/10 text-kairo-orange"
                  label={t('settings.specialFeatures')}
                  onClick={() => handleNavigate('/settings/features')}
                />
              </div>
            </div>

            {/* General Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-muted-foreground/30" />
                {t('settings.general')}
              </h4>
              <div className="space-y-1">
                <SettingItem 
                  icon={<User className="w-4.5 h-4.5" />}
                  iconColor="bg-green-500/10 text-green-500"
                  label={t('settings.account')}
                  onClick={() => handleNavigate('/settings/account')}
                />
                <SettingItem 
                  icon={<Sun className="w-4.5 h-4.5" />}
                  iconColor="bg-yellow-500/10 text-yellow-500"
                  label={t('settings.appearance')}
                  value={getThemeLabel(theme)}
                  onClick={() => handleNavigate('/settings/appearance')}
                />
                <SettingItem 
                  icon={<Globe className="w-4.5 h-4.5" />}
                  iconColor="bg-cyan-500/10 text-cyan-500"
                  label={t('settings.language')}
                  value={LANGUAGE_NAMES[language] || language}
                  onClick={() => handleNavigate('/settings/language')}
                />
                <SettingItem 
                  icon={<CreditCard className="w-4.5 h-4.5" />}
                  iconColor="bg-emerald-500/10 text-emerald-500"
                  label="Assinatura"
                  onClick={() => handleNavigate('/settings/subscription')}
                />
              </div>
            </div>

            {/* Others Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-muted-foreground/30" />
                {t('settings.others')}
              </h4>
              <div className="space-y-1">
                <SettingItem 
                  icon={<MessageCircle className="w-4.5 h-4.5" />}
                  iconColor="bg-pink-500/10 text-pink-500"
                  label={t('settings.feedback')}
                  onClick={() => handleNavigate('/settings/help')}
                />
                <SettingItem 
                  icon={<Info className="w-4.5 h-4.5" />}
                  iconColor="bg-slate-500/10 text-slate-500"
                  label={t('settings.about')}
                  onClick={() => handleNavigate('/settings/about')}
                />
                <SettingItem 
                  icon={<LogOut className="w-4.5 h-4.5" />}
                  label={t('settings.logout')}
                  danger
                  onClick={handleLogout}
                />
              </div>
            </div>
          </div>

          <div className="h-8 safe-area-bottom" />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsDrawer;
