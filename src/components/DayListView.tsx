import { format, isToday, isTomorrow, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isPast } from "date-fns";
import { MapPin, Plus, Clock } from "lucide-react";
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
  
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const extraDays = Array.from({ length: 14 }, (_, i) => addDays(monthEnd, i + 1));
  const days = [...monthDays, ...extraDays];

  const getDayEvents = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return events[dateKey] || [];
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return t('calendar.today');
    if (isTomorrow(date)) return t('calendar.tomorrow');
    return format(date, 'EEEE', { locale: dateLocale });
  };

  return (
    <div className="h-full overflow-y-auto pb-32 bg-background">
      <div className="px-4 py-2 space-y-3">
        {days.map((day, index) => {
          const isTodayDate = isToday(day);
          const dayEvents = getDayEvents(day);
          const hasEvents = dayEvents.length > 0;
          const isPastDay = isPast(day) && !isToday(day);
          const isFirstOfMonth = day.getDate() === 1;

          return (
            <div key={day.toISOString()}>
              {/* Month divider */}
              {isFirstOfMonth && index !== 0 && (
                <div className="flex items-center gap-3 py-4 mt-2">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {format(day, 'MMMM yyyy', { locale: dateLocale })}
                  </span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
              )}

              {/* Day row */}
              <div className={`flex gap-3 ${isPastDay ? 'opacity-40' : ''}`}>
                {/* Date badge */}
                <div
                  onClick={() => hasEvents ? onDateSelect(day) : onAddEvent(day)}
                  className={`flex flex-col items-center justify-center min-w-[56px] h-[56px] rounded-2xl cursor-pointer select-none ${
                    isTodayDate 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/30'
                  }`}
                >
                  <span className={`text-xl font-bold ${isTodayDate ? '' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  <span className={`text-[10px] uppercase ${isTodayDate ? 'opacity-80' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE', { locale: dateLocale })}
                  </span>
                </div>

                {/* Events or empty */}
                <div className="flex-1 min-w-0">
                  {hasEvents ? (
                    <div className="space-y-2">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => onDateSelect(day)}
                          className="bg-card border border-border/30 rounded-xl p-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            {/* Emoji */}
                            <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center text-lg flex-shrink-0">
                              {event.emoji || '📅'}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground font-medium text-sm truncate">
                                {event.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {event.isAllDay ? t('calendar.allDay') : event.time}
                                </span>
                                {event.location && (
                                  <>
                                    <MapPin className="w-3 h-3 text-muted-foreground ml-1" />
                                    <span className="text-xs text-muted-foreground truncate">
                                      {event.location}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Priority dot */}
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              event.priority === 'high' ? 'bg-red-500' :
                              event.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => onAddEvent(day)}
                      className="h-[56px] flex items-center justify-center border border-dashed border-border/30 rounded-xl cursor-pointer select-none text-muted-foreground/40 hover:text-muted-foreground/60 hover:border-border/50 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayListView;
