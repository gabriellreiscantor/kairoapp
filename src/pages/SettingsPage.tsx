import {
  Bell,
  MessageCircle,
  CreditCard,
  User,
  HelpCircle,
  ChevronRight,
  Moon,
  Volume2,
  Phone,
} from "lucide-react";
import FoxIcon from "@/components/icons/FoxIcon";

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  badge?: string;
}

const SettingItem = ({
  icon,
  label,
  description,
  onClick,
  badge,
}: SettingItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-accent transition-colors text-left"
  >
    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-foreground">{label}</p>
      {description && (
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      )}
    </div>
    {badge && (
      <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
        {badge}
      </span>
    )}
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </button>
);

const SettingsPage = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
      </header>

      {/* Profile Section */}
      <section className="px-6 mb-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-kairo-surface2 flex items-center justify-center">
              <FoxIcon size={40} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Usuário</h2>
              <p className="text-muted-foreground">+55 11 99999-9999</p>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      <section className="px-6 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 px-4">
          Alertas
        </h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <SettingItem
            icon={<Bell className="w-5 h-5" />}
            label="Notificações"
            description="Push, tela cheia, ligação"
          />
          <div className="h-px bg-border mx-4" />
          <SettingItem
            icon={<Volume2 className="w-5 h-5" />}
            label="Sons"
            description="Alertas sonoros ativados"
          />
          <div className="h-px bg-border mx-4" />
          <SettingItem
            icon={<Phone className="w-5 h-5" />}
            label="Alertas críticos"
            description="Ligações simuladas"
          />
        </div>
      </section>

      {/* Connection Section */}
      <section className="px-6 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 px-4">
          Conexões
        </h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <SettingItem
            icon={<MessageCircle className="w-5 h-5" />}
            label="WhatsApp"
            description="Conectado"
            badge="Ativo"
          />
        </div>
      </section>

      {/* Subscription Section */}
      <section className="px-6 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 px-4">
          Assinatura
        </h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <SettingItem
            icon={<CreditCard className="w-5 h-5" />}
            label="Plano"
            description="Free"
            badge="Upgrade"
          />
        </div>
      </section>

      {/* Account Section */}
      <section className="px-6 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 px-4">
          Conta
        </h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <SettingItem
            icon={<User className="w-5 h-5" />}
            label="Minha conta"
            description="Editar perfil"
          />
          <div className="h-px bg-border mx-4" />
          <SettingItem
            icon={<Moon className="w-5 h-5" />}
            label="Aparência"
            description="Tema escuro"
          />
          <div className="h-px bg-border mx-4" />
          <SettingItem
            icon={<HelpCircle className="w-5 h-5" />}
            label="Ajuda"
            description="FAQ e suporte"
          />
        </div>
      </section>

      {/* Version */}
      <div className="px-6 text-center">
        <p className="text-sm text-muted-foreground">Kairo v1.0.0</p>
      </div>
    </div>
  );
};

export default SettingsPage;
