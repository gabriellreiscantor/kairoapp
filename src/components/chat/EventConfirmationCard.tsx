import { Check, Pencil, Bell, Phone, Calendar, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface EventConfirmationCardProps {
  resumo: {
    titulo: string;
    data: string;
    hora: string;
    local: string;
    notificacao: string;
  };
  onConfirm: () => void;
  onEdit: () => void;
}

const EventConfirmationCard = ({ resumo, onConfirm, onEdit }: EventConfirmationCardProps) => {
  const isAllDay = !resumo.hora || resumo.hora === "Dia inteiro";
  
  return (
    <div className="w-full max-w-[320px]">
      {/* Header text */}
      <p className="text-sm text-muted-foreground mb-3">O Evento Foi Adicionado</p>
      
      {/* Event Card */}
      <div className="bg-kairo-surface-2 border border-border/30 rounded-2xl p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-orange-500">🔴</span>
            <span className="text-base font-semibold text-foreground">{resumo.titulo}</span>
          </div>
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
        
        {/* Date and time row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">{resumo.data}</span>
          <span className="text-muted-foreground">{isAllDay ? "Dia inteiro" : resumo.hora}</span>
        </div>
        
        {/* Me Ligue toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span className="text-sm">Me Ligue</span>
          </div>
          <Switch disabled className="data-[state=unchecked]:bg-muted" />
        </div>
        
        {/* Notification info */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bell className="w-4 h-4" />
          <span className="text-sm">{resumo.notificacao || "09:00, no dia"}</span>
        </div>
        
        {/* Location/Description */}
        {resumo.local && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{resumo.local}</span>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Check className="w-4 h-4" />
          Confirmar
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-2 bg-muted text-muted-foreground rounded-xl py-2.5 px-4 text-sm hover:bg-muted/80 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default EventConfirmationCard;
