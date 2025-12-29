import { Check, Pencil, Bell, Phone, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getColorClassName } from "@/lib/event-constants";
import { useLanguage } from "@/contexts/LanguageContext";

interface EventConfirmationCardProps {
  resumo: {
    titulo: string;
    data: string;
    hora: string;
    local: string;
    notificacao: string;
    emoji?: string;
    color?: string;
    is_all_day?: boolean;
  };
  onConfirm: () => void;
  onEdit: () => void;
}

const EventConfirmationCard = ({ resumo, onConfirm, onEdit }: EventConfirmationCardProps) => {
  const { t } = useLanguage();
  const isAllDay = resumo.is_all_day || !resumo.hora || resumo.hora === "Dia inteiro" || resumo.hora === "All day";
  const emoji = resumo.emoji || "📅";
  const color = resumo.color || "primary";
  
  return (
    <div className="w-full max-w-[320px]">
      {/* Header text */}
      <p className="text-sm text-muted-foreground mb-3">{t('event.eventAdded')}</p>
      
      {/* Event Card */}
      <div className="bg-kairo-surface-2 border border-border/30 rounded-2xl p-4 space-y-3">
        {/* Title row with emoji */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${getColorClassName(color)} flex items-center justify-center flex-shrink-0`}>
              <span className="text-base">{emoji}</span>
            </div>
            <span className="text-base font-semibold text-foreground">{resumo.titulo}</span>
          </div>
        </div>
        
        {/* Date and time row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">{resumo.data}</span>
          <span className="text-muted-foreground">{isAllDay ? t('event.allDay') : resumo.hora}</span>
        </div>
        
        {/* Me Ligue toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span className="text-sm">{t('event.callMe')}</span>
          </div>
          <Switch disabled className="data-[state=unchecked]:bg-muted" />
        </div>
        
        {/* Notification info */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bell className="w-4 h-4" />
          <span className="text-sm">{resumo.notificacao || t('event.oneHourBefore')}</span>
        </div>
        
        {/* Location/Description */}
        {resumo.local && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm truncate">{resumo.local}</span>
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
          {t('common.confirm')}
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