import { Calendar, Clock, MapPin, Bell, Phone } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const getCategoryIcon = (category?: string) => {
  const icons: Record<string, string> = {
    trabalho: "💼",
    saude: "🩺",
    pessoal: "🏠",
    fitness: "💪",
    social: "👥",
    financeiro: "💰",
    educacao: "📚",
    lazer: "🎮",
    geral: "📌",
  };
  return icons[category || "geral"] || "📌";
};

const EventCreatedCard = ({ event }: EventCreatedCardProps) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
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

  return (
    <div className="bg-gradient-to-br from-kairo-surface-2 to-kairo-surface-3 border border-primary/20 rounded-2xl p-4 shadow-lg shadow-primary/10 max-w-[300px] animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header with category icon and title */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl">
          {getCategoryIcon(event.category)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm truncate">
            {event.title}
          </h4>
          <p className="text-xs text-muted-foreground capitalize">
            {event.category || "Geral"}
          </p>
        </div>
      </div>

      {/* Date and time */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-foreground/80">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="capitalize">{formatDate(event.event_date)}</span>
        </div>
        {event.event_time && (
          <div className="flex items-center gap-2 text-xs text-foreground/80">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{formatTime(event.event_time)}</span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-foreground/80">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>

      {/* Alert types */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/20">
        {event.notification_enabled && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-kairo-surface-2 px-2 py-1 rounded-full">
            <Bell className="w-3 h-3" />
            <span>Notificação</span>
          </div>
        )}
        {event.call_alert_enabled && (
          <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-full">
            <Phone className="w-3 h-3" />
            <span>Chamada</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCreatedCard;
