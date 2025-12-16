import { X, ChevronRight, Calendar, Bell, Sparkles, Zap, User, Globe, MessageCircle, Info, LogOut, ChevronsUpDown, ExternalLink } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import kairoLogo from "@/assets/kairo-logo.png";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueIcon?: 'chevron' | 'updown' | 'external';
  onClick?: () => void;
  danger?: boolean;
}

const SettingItem = ({ icon, label, value, valueIcon = 'chevron', onClick, danger }: SettingItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-kairo-surface-3/50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className={danger ? "text-primary" : "text-muted-foreground"}>{icon}</div>
      <span className={danger ? "text-primary" : "text-foreground"}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      {valueIcon === 'chevron' && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
      {valueIcon === 'updown' && <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />}
      {valueIcon === 'external' && <ExternalLink className="w-4 h-4 text-muted-foreground/50" />}
    </div>
  </button>
);

const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const navigate = useNavigate();
  const usedEvents = 0;
  const maxEvents = 14;
  const progress = (usedEvents / maxEvents) * 100;

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-kairo-surface-1 border-border/20 max-h-[90vh]" aria-describedby="settings-description">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Configurações</DrawerTitle>
          <DrawerDescription id="settings-description">
            Configurações do aplicativo Kairo
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto">
          {/* Plan Card */}
          <div className="px-4 pt-2 pb-4">
            <div className="gradient-plan rounded-2xl p-4 relative">
              <button 
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              
              <p className="text-white/70 text-sm">Plano gratuito</p>
              <button 
                onClick={() => handleNavigate('/settings/plan')}
                className="absolute top-4 right-14 text-primary text-sm font-medium"
              >
                Atualizar
              </button>
              
              <button 
                onClick={() => handleNavigate('/settings/plan')}
                className="flex items-center justify-between w-full mt-2"
              >
                <span className="text-white/80 text-sm">Eventos agendados</span>
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold">{usedEvents}</span>
                  <span className="text-white/70">/{maxEvents}</span>
                  <ChevronRight className="w-4 h-4 text-white/50" />
                </div>
              </button>
            </div>
          </div>

          {/* Kairo Section */}
          <div className="px-4 mb-4">
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Kairo</h4>
            <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
              <SettingItem 
                icon={<Calendar className="w-5 h-5" />} 
                label="Calendários"
                value="Kairo"
                onClick={() => handleNavigate('/settings/calendars')}
              />
              <SettingItem 
                icon={<Bell className="w-5 h-5" />} 
                label="Notificação de Evento"
                onClick={() => handleNavigate('/settings/notifications')}
              />
              <SettingItem 
                icon={<Sparkles className="w-5 h-5" />} 
                label="Tarefas Inteligentes"
                onClick={() => handleNavigate('/settings/smart-tasks')}
              />
              <SettingItem 
                icon={<Zap className="w-5 h-5" />} 
                label="Recursos Especiais"
                onClick={() => handleNavigate('/settings/features')}
              />
            </div>
          </div>

          {/* General Section */}
          <div className="px-4 mb-4">
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Geral</h4>
            <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
              <SettingItem 
                icon={<User className="w-5 h-5" />} 
                label="Conta"
                onClick={() => handleNavigate('/settings/account')}
              />
              <SettingItem 
                icon={<div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /></div>} 
                label="Aparência"
                value="Sistema"
                valueIcon="updown"
                onClick={() => handleNavigate('/settings/appearance')}
              />
              <SettingItem 
                icon={<Globe className="w-5 h-5" />} 
                label="Idioma"
                value="português"
                valueIcon="external"
                onClick={() => handleNavigate('/settings/language')}
              />
            </div>
          </div>

          {/* Others Section */}
          <div className="px-4 mb-4">
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Outros</h4>
            <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
              <SettingItem 
                icon={<MessageCircle className="w-5 h-5" />} 
                label="Comentários"
                onClick={() => handleNavigate('/settings/help')}
              />
              <SettingItem 
                icon={<Info className="w-5 h-5" />} 
                label="Sobre"
                onClick={() => handleNavigate('/settings/about')}
              />
              <SettingItem 
                icon={<LogOut className="w-5 h-5" />} 
                label="Sair"
                valueIcon="chevron"
                danger
              />
            </div>
          </div>

          <div className="h-8 safe-area-bottom" />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsDrawer;
