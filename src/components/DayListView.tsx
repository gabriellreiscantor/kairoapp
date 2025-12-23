import { format, isToday, isTomorrow, addDays, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isPast, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  isAllDay?: boolean;
  endDate?: Date;
  location?: string;
  emoji?: string;
}

interface DayListViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onAddEvent: (date: Date) => void;
  events: Record<string, Event[]>;
}

const DayListView = ({ selectedDate, onDateSelect, onAddEvent, events }: DayListViewProps) => {
  const { t, getDateLocale } = useLanguage();
  const dateLocale = getDateLocale();
  
  // Generate days from start of current month to end + some extra days
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  // Get all days of the current month plus next 14 days
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const extraDays = Array.from({ length: 14 }, (_, i) => addDays(monthEnd, i + 1));
  const days = [...monthDays, ...extraDays];

  const getDayEvents = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return events[dateKey] || [];
  };

  // Format weekday in current locale
  const formatWeekday = (date: Date) => {
    return format(date, 'EEEE', { locale: dateLocale });
  };

  // Get friendly date label
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return t('calendar.today');
    if (isTomorrow(date)) return t('calendar.tomorrow');
    return formatWeekday(date);
  };

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-primary';
    }
  };

  return (
    <div className="px-4 pt-2 pb-32 space-y-1 bg-background min-h-[calc(100%+100px)]">
      {days.map((day, index) => {
        const isTodayDate = isToday(day);
        const dayEvents = getDayEvents(day);
        const hasEvents = dayEvents.length > 0;
        const isPastDay = isPast(day) && !isToday(day);
        const isFirstOfMonth = day.getDate() === 1;

        return (
          <div key={day.toISOString()}>
            {/* Month separator */}
            {isFirstOfMonth && index !== 0 && (
              <div className="flex items-center gap-3 py-4 mt-4">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {format(day, 'MMMM yyyy', { locale: dateLocale })}
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
            )}

            {/* Day Row */}
            <div 
              className={`flex items-start gap-3 py-3 transition-all duration-200 ${
                isPastDay ? 'opacity-50' : ''
              }`}
            >
              {/* Date Column */}
              <button
                onClick={() => hasEvents ? onDateSelect(day) : onAddEvent(day)}
                onTouchEnd={(e) => {
                  // Fallback para iOS
                  e.stopPropagation();
                  hasEvents ? onDateSelect(day) : onAddEvent(day);
                }}
                className={`flex flex-col items-center min-w-[52px] py-2 px-1 rounded-xl transition-all duration-200 ${
                  isTodayDate 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted/50 active:scale-95'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                <span className={`text-2xl font-bold leading-none ${
                  isTodayDate ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </span>
                <span className={`text-[10px] uppercase tracking-wide mt-1 ${
                  isTodayDate ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  {format(day, 'EEE', { locale: dateLocale })}
                </span>
              </button>

              {/* Events Column */}
              <div className="flex-1 min-w-0">
                {hasEvents ? (
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onDateSelect(day)}
                        onTouchEnd={(e) => {
                          // Fallback para iOS
                          e.stopPropagation();
                          onDateSelect(day);
                        }}
                        className="w-full bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-4 text-left transition-all duration-200 hover:border-primary/30 active:scale-[0.98] group event-card"
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Emoji or Priority Indicator */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-xl">
                            {event.emoji || '📅'}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Title */}
                            <h3 className="text-foreground font-medium truncate group-hover:text-primary transition-colors">
                              {event.title}
                            </h3>
                            
                            {/* Time and Location */}
                            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${getPriorityColor(event.priority)}`} />
                                <span>
                                  {event.isAllDay ? t('calendar.allDay') : event.time}
                                </span>
                              </div>
                              
                              {event.location && (
                                <div className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Multi-day indicator */}
                          {event.endDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                              <CalendarIcon className="w-3 h-3" />
                              <span>{format(event.endDate, 'd MMM', { locale: dateLocale })}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Empty day - subtle add button */
                  <button
                    onClick={() => onAddEvent(day)}
                    onTouchEnd={(e) => {
                      // Fallback para iOS
                      e.stopPropagation();
                      onAddEvent(day);
                    }}
                    className="w-full py-3 flex items-center justify-center text-muted-foreground/30 hover:text-primary hover:bg-muted/30 rounded-xl transition-all duration-200"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Separator line */}
            {hasEvents && (
              <div className="ml-[64px] h-px bg-border/30" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DayListView;
