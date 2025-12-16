import React from "react";
import { Calendar, MapPin, Trash2, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventDeletedCardProps {
  event: {
    id?: string;
    title: string;
    event_date: string;
    event_time?: string;
    location?: string;
    category?: string;
  };
}

const EventDeletedCard = React.forwardRef<HTMLDivElement, EventDeletedCardProps>(
  ({ event }, ref) => {
  
  // Guard: Don't render if essential fields are missing
  if (!event || !event.title || !event.event_date) {
    console.warn('[EventDeletedCard] Missing required fields:', { 
      hasEvent: !!event,
      title: event?.title, 
      event_date: event?.event_date 
    });
    return null;
  }

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
    if (!timeStr) return "Dia inteiro";
    try {
      const [hours, minutes] = timeStr.split(":");
      return `${hours}:${minutes}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div ref={ref} className="w-full max-w-[320px] animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header text with deleted icon */}
      <div className="flex items-center gap-2 mb-3">
        <Trash2 className="w-4 h-4 text-red-500" />
        <p className="text-sm text-muted-foreground">
          Evento Removido
        </p>
      </div>
      
      {/* Event Card - Muted style for deleted */}
      <div className="bg-kairo-surface-2/50 border border-red-500/20 rounded-2xl p-4 space-y-3 opacity-80">
        {/* Title row with strikethrough */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500/60" />
            <span className="text-base font-semibold text-foreground/60 line-through">
              {event.title}
            </span>
          </div>
          <Trash2 className="w-5 h-5 text-red-500/60" />
        </div>
        
        {/* Date and time row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/50 capitalize line-through">
            {formatDate(event.event_date)}
          </span>
          <div className="flex items-center gap-1 text-foreground/50">
            <Clock className="w-3 h-3" />
            <span className="line-through">{formatTime(event.event_time)}</span>
          </div>
        </div>
        
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500/40" />
            <span className="text-sm text-muted-foreground/50 line-through">
              {event.location}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

EventDeletedCard.displayName = 'EventDeletedCard';

export default EventDeletedCard;
