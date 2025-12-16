import { X, ChevronRight, Calendar, Bell, Sparkles, Zap, User, Palette, Globe, HelpCircle, Info, LogOut, Pencil } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";

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
    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-kairo-surface-3 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-foreground font-medium">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      {showChevron && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
    </div>
  </button>
);

const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const usedEvents = 3;
  const maxEvents = 14;
  const progress = (usedEvents / maxEvents) * 100;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-kairo-surface-1 border-border/30 max-h-[90vh]">
        <DrawerHeader className="px-6 pt-4 pb-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-foreground text-lg font-semibold">Configurações</DrawerTitle>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-kairo-surface-2 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </DrawerHeader>

        <div className="px-6 py-4 overflow-y-auto">
          {/* Profile Section */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-kairo-surface-3 flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Pencil className="w-3 h-3 text-primary-foreground" />
              </button>
            </div>
            <div>
              <h3 className="text-foreground font-semibold">Usuário</h3>
              <p className="text-sm text-muted-foreground">usuario@email.com</p>
            </div>
          </div>

          {/* Plan Card */}
          <div className="gradient-plan rounded-3xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/80 text-sm">Plano atual</p>
                <h3 className="text-white font-bold text-lg">Gratuito</h3>
              </div>
              <button className="bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                Atualizar
              </button>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-xs">Eventos agendados</span>
                <span className="text-white font-semibold text-sm">{usedEvents}/{maxEvents}</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
            </div>
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Kairo Section */}
            <div>
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-4">Kairo</h4>
              <div className="bg-kairo-surface-2 rounded-2xl">
                <SettingItem icon={<Calendar className="w-5 h-5" />} label="Calendários" />
                <SettingItem icon={<Bell className="w-5 h-5" />} label="Notificação de Evento" />
                <SettingItem icon={<Sparkles className="w-5 h-5" />} label="Tarefas Inteligentes" />
                <SettingItem icon={<Zap className="w-5 h-5" />} label="Recursos Especiais" />
              </div>
            </div>

            {/* General Section */}
            <div>
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-4">Geral</h4>
              <div className="bg-kairo-surface-2 rounded-2xl">
                <SettingItem icon={<User className="w-5 h-5" />} label="Conta" />
                <SettingItem icon={<Palette className="w-5 h-5" />} label="Aparência" value="Sistema" />
                <SettingItem icon={<Globe className="w-5 h-5" />} label="Idioma" value="Português" />
              </div>
            </div>

            {/* Others Section */}
            <div>
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-4">Outros</h4>
              <div className="bg-kairo-surface-2 rounded-2xl">
                <SettingItem icon={<HelpCircle className="w-5 h-5" />} label="Ajuda" />
                <SettingItem icon={<Info className="w-5 h-5" />} label="Sobre" />
                <SettingItem 
                  icon={<LogOut className="w-5 h-5 text-kairo-red" />} 
                  label="Sair" 
                  showChevron={false}
                />
              </div>
            </div>
          </div>

          {/* Version */}
          <p className="text-center text-xs text-muted-foreground mt-6 mb-4">
            Kairo v1.0.0
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsDrawer;
