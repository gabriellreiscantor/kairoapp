import { ChevronLeft, Bell, Phone, MessageSquare, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

const NotificationSettingsPage = () => {
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [callEnabled, setCallEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Notificações</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Notification Channels */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Canais de Notificação
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Alertas no dispositivo</p>
                </div>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Me Ligue</p>
                  <p className="text-xs text-muted-foreground">Chamada simulada para alertas críticos</p>
                </div>
              </div>
              <Switch checked={callEnabled} onCheckedChange={setCallEnabled} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Lembretes via WhatsApp</p>
                </div>
              </div>
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
            </div>
          </div>
        </div>

        {/* Sound & Vibration */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Som & Vibração
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Som</span>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="w-3 h-4 border-2 border-muted-foreground rounded-sm" />
                </div>
                <span className="text-foreground">Vibração</span>
              </div>
              <Switch checked={vibrationEnabled} onCheckedChange={setVibrationEnabled} />
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Alertas Críticos
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-foreground">Alertas Críticos</p>
                <p className="text-xs text-muted-foreground">
                  Toca mesmo no modo silencioso
                </p>
              </div>
              <Switch checked={criticalAlerts} onCheckedChange={setCriticalAlerts} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Alertas críticos ignoram o modo silencioso e "Não Perturbe" para garantir que você não perca compromissos importantes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
