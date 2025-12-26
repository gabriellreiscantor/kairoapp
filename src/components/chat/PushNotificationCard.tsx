import { Bell, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface PushNotificationCardProps {
  eventTitle: string;
  eventTime: string;
  eventId: string;
  notificationSentAt: string;
  onViewEvent?: (eventId: string) => void;
}

const PushNotificationCard = ({ 
  eventTitle, 
  eventTime, 
  eventId, 
  notificationSentAt,
  onViewEvent 
}: PushNotificationCardProps) => {
  const { getDateLocale } = useLanguage();
  const dateLocale = getDateLocale();
  
  // Format the time when the notification was sent
  const formattedNotificationTime = (() => {
    try {
      const notifDate = new Date(notificationSentAt);
      return format(notifDate, 'HH:mm', { locale: dateLocale });
    } catch {
      return '';
    }
  })();

  // Format event time for display
  const formattedEventTime = eventTime?.slice(0, 5) || '';

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 max-w-[85%] animate-fade-in">
      {/* Header with bell icon */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Bell className="w-4 h-4 text-blue-500" />
        </div>
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          🔔 Notificação enviada
        </span>
      </div>
      
      {/* Message content */}
      <p className="text-sm text-foreground mb-3">
        Enviei uma notificação para te lembrar do evento "{eventTitle}" às {formattedEventTime}.
      </p>
      
      {/* Notification time */}
      <div className="text-xs text-muted-foreground mb-3">
        Notificação enviada às {formattedNotificationTime}
      </div>
      
      {/* View event button */}
      {onViewEvent && (
        <button
          onClick={() => onViewEvent(eventId)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <span>Ver evento</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default PushNotificationCard;
