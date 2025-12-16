import { Calendar, Bell, Phone, MapPin, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";

interface EventCreatedCardProps {
  event: {
    title: string;
    event_date: string;
    event_time?: string;
    location?: string;
    category?: string;
    notification_enabled?: boolean;
    call_alert_enabled?: boolean;
  };
}

const getCategoryEmoji = (category?: string) => {
  const emojis: Record<string, string> = {
    trabalho: "💼",
    saude: "🩺",
    pessoal: "🏠",
    fitness: "💪",
    social: "👥",
    financeiro: "💰",
    educacao: "📚",
    lazer: "🎮",
    geral: "🔴",
  };
  return emojis[category || "geral"] || "🔴";
};

const EventCreatedCard = ({ event }: EventCreatedCardProps) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return "Hoje";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Amanhã";
      }
      return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(":");
      return `${hours}:${minutes}`;
    } catch {
      return timeStr;
    }
  };

  const isAllDay = !event.event_time;

  return (
    <div className="w-full max-w-[320px] animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header text with success icon */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <p className="text-sm text-muted-foreground">Evento Criado</p>
      </div>
      
      {/* Event Card */}
      <div className="bg-kairo-surface-2 border border-border/30 rounded-2xl p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span>{getCategoryEmoji(event.category)}</span>
            <span className="text-base font-semibold text-foreground">{event.title}</span>
          </div>
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
        
        {/* Date and time row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground capitalize">{formatDate(event.event_date)}</span>
          <span className="text-muted-foreground">{isAllDay ? "Dia inteiro" : formatTime(event.event_time)}</span>
        </div>
        
        {/* Me Ligue toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span className="text-sm">Me Ligue</span>
          </div>
          <Switch 
            checked={event.call_alert_enabled || false} 
            disabled 
            className="data-[state=unchecked]:bg-muted data-[state=checked]:bg-primary" 
          />
        </div>
        
        {/* Notification info */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bell className="w-4 h-4" />
          <span className="text-sm">
            {event.event_time ? `${formatTime(event.event_time)}, no dia` : "09:00, no dia"}
          </span>
        </div>
        
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{event.location}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCreatedCard;
