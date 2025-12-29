import { Phone, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface CallNotificationCardProps {
  eventTitle: string;
  eventTime: string;
  eventId: string;
  callSentAt: string;
  answered?: boolean;
  onViewEvent?: (eventId: string) => void;
}

const CallNotificationCard = ({ 
  eventTitle, 
  eventTime, 
  eventId, 
  callSentAt,
  answered,
  onViewEvent 
}: CallNotificationCardProps) => {
  const { t, getDateLocale } = useLanguage();
  const dateLocale = getDateLocale();
  
  // Format the time when the call was sent
  const formattedCallTime = (() => {
    try {
      const callDate = new Date(callSentAt);
      return format(callDate, 'HH:mm', { locale: dateLocale });
    } catch {
      return '';
    }
  })();

  // Format event time for display
  const formattedEventTime = eventTime?.slice(0, 5) || '';

  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 max-w-[85%] animate-fade-in">
      {/* Header with phone icon */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Phone className="w-4 h-4 text-green-500" />
        </div>
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          {t('callCard.iCalled')}
        </span>
      </div>
      
      {/* Message content */}
      <p className="text-sm text-foreground mb-3">
        {answered 
          ? `${t('callCard.youAnswered')} "${eventTitle}" ${t('callCard.at')} ${formattedEventTime}.`
          : `${t('callCard.justCalled')} "${eventTitle}" ${t('callCard.at')} ${formattedEventTime}.`
        }
      </p>
      
      {!answered && (
        <p className="text-xs text-muted-foreground mb-3">
          {t('callCard.missedCall')}
        </p>
      )}
      
      {/* Call time */}
      <div className="text-xs text-muted-foreground mb-3">
        {answered ? t('callCard.callAnswered') : t('callCard.callSent')} {formattedCallTime}
      </div>
      
      {/* View event button */}
      {onViewEvent && (
        <button
          onClick={() => onViewEvent(eventId)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <span>{t('callCard.viewEvent')}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default CallNotificationCard;