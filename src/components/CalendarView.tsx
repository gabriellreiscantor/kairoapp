import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  startOfWeek, 
  endOfWeek,
  isSameMonth
} from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  isAllDay?: boolean;
  emoji?: string;
}

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  events?: Record<string, CalendarEvent[]>;
}

const CalendarView = ({ selectedDate, onDateSelect, currentMonth, events = {} }: CalendarViewProps) => {
  const { t } = useLanguage();
  
  const weekdays = [
    t('calendar.weekdaySun'),
    t('calendar.weekdayMon'),
    t('calendar.weekdayTue'),
    t('calendar.weekdayWed'),
    t('calendar.weekdayThu'),
    t('calendar.weekdayFri'),
    t('calendar.weekdaySat'),
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return events[dateKey] || [];
  };

  const formatEventTime = (event: CalendarEvent): string => {
    if (event.isAllDay || !event.time) return "Dia in...";
    try {
      const [hours, minutes] = event.time.split(":");
      return `${hours}:${minutes}`;
    } catch {
      return event.time;
    }
  };

  // Max events to show per cell (2 visible + overflow indicator)
  const MAX_VISIBLE_EVENTS = 2;

  return (
    <div className="flex flex-col h-full px-1">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1 border-b border-border/20 pb-2">
        {weekdays.map((day, index) => (
          <div key={index} className="text-center text-xs text-muted-foreground font-semibold py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col">
        {weeks.map((week, weekIndex) => (
          <div 
            key={weekIndex} 
            className="flex-1 grid grid-cols-7 border-b border-border/10 min-h-[90px]"
          >
            {week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isSelected = isSameDay(day, selectedDate);
              const dayEvents = getEventsForDate(day);
              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const overflowCount = dayEvents.length - MAX_VISIBLE_EVENTS;
              
              return (
                <button
                  key={dayIndex}
                  onClick={() => onDateSelect(day)}
                  className={`
                    relative flex flex-col items-center p-1 transition-all duration-200 
                    ${isCurrentMonth ? '' : 'opacity-30'}
                  `}
                >
                  {/* Day number */}
                  <span
                    className={`
                      calendar-number w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 transition-all duration-200
                      ${!isCurrentMonth ? 'text-muted-foreground/40' : 'text-foreground'}
                      ${isTodayDate ? 'bg-primary text-primary-foreground font-bold' : ''}
                      ${isSelected && !isTodayDate ? 'bg-muted text-foreground font-medium' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  
                  {/* Event chips */}
                  {isCurrentMonth && dayEvents.length > 0 && (
                    <div className="w-full flex flex-col gap-0.5 px-0.5">
                      {visibleEvents.map((event, idx) => (
                        <div
                          key={event.id || idx}
                          className="w-full bg-kairo-surface-2 border border-border/30 rounded px-1 py-0.5 truncate"
                        >
                          <span className="text-[10px] font-medium text-foreground truncate block leading-tight">
                            {event.title.length > 6 ? event.title.slice(0, 6) + '...' : event.title}
                          </span>
                          <span className="text-[9px] text-primary truncate block leading-tight">
                            {formatEventTime(event)}
                          </span>
                        </div>
                      ))}
                      
                      {/* Overflow indicator */}
                      {overflowCount > 0 && (
                        <div className="text-center">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            +{overflowCount}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
