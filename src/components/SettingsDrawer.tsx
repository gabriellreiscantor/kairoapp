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
          {/* Close Button */}
          <div className="flex justify-end px-4 pt-2">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* User Profile */}
          <div className="px-4 py-4 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-kairo-surface-2 overflow-hidden">
              <img 
                src={kairoLogo} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-lg font-semibold">Usuário Kairo</span>
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <span className="text-muted-foreground text-sm">usuario@kairo.app</span>
            </div>
          </div>

          {/* Plan Card */}
          <div className="px-4 pb-4">
            <button 
              onClick={() => handleNavigate('/settings/plan')}
              className="w-full gradient-plan rounded-2xl p-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-left">Plano gratuito</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-white/80 text-sm">Eventos agendados</span>
                  </div>
                </div>
                <button 
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('/settings/plan');
                  }}
                >
                  Atualizar
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex-1 mr-4">
                  <Progress value={progress} className="h-1 bg-white/20" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-white font-bold">{usedEvents}</span>
                  <span className="text-white/70 text-sm">/ {maxEvents}</span>
                  <ChevronRight className="w-4 h-4 text-white/50" />
                </div>
              </div>
            </button>
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
