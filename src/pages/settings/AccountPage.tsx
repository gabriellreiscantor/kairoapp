import { ChevronLeft, User, Mail, Shield, Trash2, Pencil, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

const AccountPage = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, isLoading } = useAuth();
  
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
      toast.error("Usuário não autenticado");
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
      toast.success("Alterações salvas com sucesso!");
    } else {
      toast.error("Erro ao salvar alterações");
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
        <h1 className="text-xl font-bold text-foreground">Conta</h1>
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
              <div className="w-24 h-24 rounded-full bg-kairo-surface-3 flex items-center justify-center">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Toque para alterar foto</p>
        </div>

        {/* Account Info */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Informações Pessoais
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border/10">
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="px-4 py-3.5 border-b border-border/10">
              <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-transparent text-muted-foreground focus:outline-none cursor-not-allowed"
              />
            </div>
            <div className="px-4 py-3.5">
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
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
            Segurança
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Alterar Senha</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Verificar E-mail</span>
              </div>
              <span className={`text-xs ${user?.email_confirmed_at ? 'text-kairo-green' : 'text-kairo-amber'}`}>
                {user?.email_confirmed_at ? 'Verificado' : 'Pendente'}
              </span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Zona de Perigo
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center gap-3 px-4 py-3.5 text-kairo-red">
              <Trash2 className="w-5 h-5" />
              <span>Excluir Conta</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Ao excluir sua conta, todos os seus dados serão permanentemente removidos.
          </p>
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
};

export default AccountPage;
