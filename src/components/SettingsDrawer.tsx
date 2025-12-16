import { X, ChevronRight, Calendar, Bell, Sparkles, Zap, User, Palette, Globe, HelpCircle, Info, LogOut, Pencil } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  showChevron?: boolean;
}

const SettingItem = ({ icon, label, value, onClick, showChevron = true }: SettingItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-kairo-surface-3/50 transition-colors"
  >
    <div className="flex items-center gap-2.5">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-foreground text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-1.5">
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
      {showChevron && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
    </div>
  </button>
);

const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const navigate = useNavigate();
  const usedEvents = 3;
  const maxEvents = 14;
  const progress = (usedEvents / maxEvents) * 100;

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-kairo-surface-1 border-border/20 max-h-[85vh]" aria-describedby="settings-description">
        <DrawerHeader className="px-4 pt-3 pb-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-foreground text-sm font-semibold">Configurações</DrawerTitle>
            <button 
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-kairo-surface-2 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <DrawerDescription id="settings-description" className="sr-only">
            Configurações do aplicativo Kairo
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-3 overflow-y-auto">
          {/* Profile Section */}
          <button onClick={() => handleNavigate('/settings/account')} className="flex items-center gap-3 mb-4 w-full">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-kairo-surface-3 flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Pencil className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            </div>
            <div className="text-left">
              <h3 className="text-foreground text-sm font-semibold">Usuário</h3>
              <p className="text-xs text-muted-foreground">usuario@email.com</p>
            </div>
          </button>

          {/* Plan Card */}
          <button onClick={() => handleNavigate('/settings/features')} className="w-full gradient-plan rounded-2xl p-3.5 mb-4 text-left">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/70 text-[10px]">Plano atual</p>
                <h3 className="text-white font-semibold text-sm">Gratuito</h3>
              </div>
              <span className="bg-white/20 text-white font-medium px-3 py-1.5 rounded-lg text-xs">
                Atualizar
              </span>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/70 text-[10px]">Eventos agendados</span>
                <span className="text-white font-semibold text-xs">{usedEvents}/{maxEvents}</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-white/20" />
            </div>
          </button>

          {/* Settings Sections */}
          <div className="space-y-4">
            {/* Kairo Section */}
            <div>
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-3">Kairo</h4>
              <div className="bg-kairo-surface-2 rounded-xl overflow-hidden">
                <SettingItem icon={<Calendar className="w-4 h-4" />} label="Calendários" onClick={() => handleNavigate('/settings/calendars')} />
                <SettingItem icon={<Bell className="w-4 h-4" />} label="Notificações" onClick={() => handleNavigate('/settings/notifications')} />
                <SettingItem icon={<Sparkles className="w-4 h-4" />} label="Tarefas Inteligentes" onClick={() => handleNavigate('/settings/smart-tasks')} />
                <SettingItem icon={<Zap className="w-4 h-4" />} label="Recursos Especiais" onClick={() => handleNavigate('/settings/features')} />
              </div>
            </div>

            {/* General Section */}
            <div>
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-3">Geral</h4>
              <div className="bg-kairo-surface-2 rounded-xl overflow-hidden">
                <SettingItem icon={<User className="w-4 h-4" />} label="Conta" onClick={() => handleNavigate('/settings/account')} />
                <SettingItem icon={<Palette className="w-4 h-4" />} label="Aparência" value="Escuro" onClick={() => handleNavigate('/settings/appearance')} />
                <SettingItem icon={<Globe className="w-4 h-4" />} label="Idioma" value="PT-BR" onClick={() => handleNavigate('/settings/language')} />
              </div>
            </div>

            {/* Others Section */}
            <div>
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-3">Outros</h4>
              <div className="bg-kairo-surface-2 rounded-xl overflow-hidden">
                <SettingItem icon={<HelpCircle className="w-4 h-4" />} label="Ajuda" onClick={() => handleNavigate('/settings/help')} />
                <SettingItem icon={<Info className="w-4 h-4" />} label="Sobre" onClick={() => handleNavigate('/settings/about')} />
                <SettingItem 
                  icon={<LogOut className="w-4 h-4 text-kairo-red" />} 
                  label="Sair" 
                  showChevron={false}
                />
              </div>
            </div>
          </div>

          {/* Version */}
          <p className="text-center text-[10px] text-muted-foreground mt-4 mb-2">
            Kairo v1.0.0
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsDrawer;
