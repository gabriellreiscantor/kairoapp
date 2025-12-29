import { Calendar, Clock, MapPin } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface ListedEvent {
  id: string;
  titulo: string;
  data: string;
  hora?: string;
  local?: string;
  prioridade?: string;
  categoria?: string;
}

interface EventListCardProps {
  events: ListedEvent[];
}

const getCategoryEmoji = (category?: string) => {
  const emojis: Record<string, string> = {
    trabalho: "💼",
    pessoal: "🏠",
    saude: "🏥",
    lazer: "🎮",
    estudos: "📚",
    social: "👥",
    financeiro: "💰",
    geral: "📌",
  };
  return emojis[category || "geral"] || "📌";
};

const EventListCard = ({ events }: EventListCardProps) => {
  const { t, getDateLocale } = useLanguage();

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return t('event.today') || "Today";
      if (isTomorrow(date)) return t('event.tomorrow') || "Tomorrow";
      return format(date, t('event.dateFormatShort') || "MMM d", { locale: getDateLocale() });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return t('event.allDay') || "All day";
    try {
      const [hours, minutes] = timeStr.split(":");
      return `${hours}:${minutes}`;
    } catch {
      return timeStr;
    }
  };

  if (!events || events.length === 0) return null;

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg p-3 hover:border-primary/30 transition-colors"
        >
          {/* Title with category emoji */}
          <div className="flex items-start gap-2 mb-2">
            <span className="text-base">{getCategoryEmoji(event.categoria)}</span>
            <h4 className="font-medium text-foreground text-sm leading-tight">
              {event.titulo}
            </h4>
          </div>

          {/* Date and time */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(event.data)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(event.hora)}</span>
            </div>
          </div>

          {/* Location if present */}
          {event.local && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{event.local}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EventListCard;
