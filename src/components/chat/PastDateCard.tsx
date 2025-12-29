import React from "react";
import { AlertTriangle, Calendar, Clock, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface PastDateCardProps {
  event: {
    titulo: string;
    data: string;
    hora?: string;
    local?: string;
  };
}

const PastDateCard = React.forwardRef<HTMLDivElement, PastDateCardProps>(
  ({ event }, ref) => {
    const { t, getDateLocale } = useLanguage();

    if (!event || !event.titulo || !event.data) {
      return null;
    }

    const formatDate = (dateStr: string): string => {
      try {
        const date = parseISO(dateStr);
        return format(date, t('event.dateFormat') || "EEEE, MMMM d", { locale: getDateLocale() });
      } catch {
        return dateStr;
      }
    };

    const formatTime = (timeStr?: string): string => {
      if (!timeStr) return t('event.allDay') || "All day";
      return timeStr;
    };

    return (
      <div
        ref={ref}
        className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 max-w-[320px] animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-sky-500" />
          </div>
          <span className="text-sm font-medium text-sky-500">
            {t('event.pastDate') || "Past Date"}
          </span>
        </div>

        {/* Event info that was attempted */}
        <div className="space-y-2 mb-3 opacity-70">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground line-through">
              {event.titulo}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="line-through">
              {formatDate(event.data)}{event.hora && `, ${formatTime(event.hora)}`}
            </span>
          </div>

          {event.local && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="line-through">{event.local}</span>
            </div>
          )}
        </div>

        {/* Warning message */}
        <p className="text-xs text-sky-600 dark:text-sky-400 leading-relaxed">
          {t('event.pastDateMessage') || "This date and time have already passed. Please choose a future date."}
        </p>
      </div>
    );
  }
);

PastDateCard.displayName = "PastDateCard";

export default PastDateCard;
