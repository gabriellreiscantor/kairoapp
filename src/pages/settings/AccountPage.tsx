import { ChevronLeft, Mail, Shield, Trash2, Pencil, Loader2 } from "lucide-react";
import defaultAvatar from "@/assets/default-avatar.png";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { useLanguage } from "@/contexts/LanguageContext";

const AccountPage = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, isLoading } = useAuth();
  const { t } = useLanguage();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync state when profile/user loads
  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setPhone(profile.phone || "");
    }
    if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error(t('account.saveError'));
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: name,
        phone: phone,
      })
      .eq('id', user.id);

    if (!error) {
      await refreshProfile();
      toast.success(t('account.saved'));
    } else {
      toast.error(t('account.saveError'));
      console.error(error);
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">{t('account.title')}</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center py-4">
          <div className="relative mb-3">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <img 
                src={defaultAvatar} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{t('account.tapToChangePhoto')}</p>
        </div>

        {/* Account Info */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {t('account.personalInfo')}
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border/10">
              <label className="text-xs text-muted-foreground mb-1 block">{t('account.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('account.namePlaceholder')}
                className="w-full bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="px-4 py-3.5 border-b border-border/10">
              <label className="text-xs text-muted-foreground mb-1 block">{t('account.email')}</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-transparent text-muted-foreground focus:outline-none cursor-not-allowed"
              />
            </div>
            <div className="px-4 py-3.5">
              <label className="text-xs text-muted-foreground mb-1 block">{t('account.phone')}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 99999-9999"
                className="w-full bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {t('account.security')}
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">{t('account.changePassword')}</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">{t('account.verifyEmail')}</span>
              </div>
              <span className={`text-xs ${user?.email_confirmed_at ? 'text-kairo-green' : 'text-kairo-amber'}`}>
                {user?.email_confirmed_at ? t('account.verified') : t('account.pending')}
              </span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {t('account.dangerZone')}
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center gap-3 px-4 py-3.5 text-kairo-red">
              <Trash2 className="w-5 h-5" />
              <span>{t('account.deleteAccount')}</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            {t('account.deleteWarning')}
          </p>
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? t('account.saving') : t('account.saveChanges')}
        </button>
      </div>
    </div>
  );
};

export default AccountPage;