import { useState, useRef, useCallback } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  isAllDay?: boolean;
  emoji?: string;
  location?: string;
}

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  events?: Record<string, CalendarEvent[]>;
}

type ZoomLevel = 1 | 1.5 | 2;

const CalendarView = ({ selectedDate, onDateSelect, currentMonth, events = {} }: CalendarViewProps) => {
  const { t } = useLanguage();
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(1);
  const lastTapRef = useRef<number>(0);
  
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
    if (event.isAllDay || !event.time) return "Dia inteiro";
    try {
      const [hours, minutes] = event.time.split(":");
      return `${hours}:${minutes}`;
    } catch {
      return event.time;
    }
  };

  // Zoom configurations
  const zoomConfig = {
    1: { cellHeight: 'min-h-[90px]', maxEvents: 2, titleLength: 6, showLocation: false },
    1.5: { cellHeight: 'min-h-[135px]', maxEvents: 3, titleLength: 12, showLocation: true },
    2: { cellHeight: 'min-h-[180px]', maxEvents: 4, titleLength: 20, showLocation: true }
  };

  const config = zoomConfig[zoomLevel];

  // Double-tap handler
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - cycle zoom
      setZoomLevel(prev => {
        if (prev === 1) return 1.5;
        if (prev === 1.5) return 2;
        return 1;
      });
    }
    lastTapRef.current = now;
  }, []);

  const increaseZoom = () => {
    setZoomLevel(prev => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 2;
    });
  };

  const decreaseZoom = () => {
    setZoomLevel(prev => {
      if (prev === 2) return 1.5;
      if (prev === 1.5) return 1;
      return 1;
    });
  };

  const calendarContent = (
    <div className="flex flex-col" onClick={handleDoubleTap}>
      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col">
        {weeks.map((week, weekIndex) => (
          <div 
            key={weekIndex} 
            className={`flex-1 grid grid-cols-7 border-b border-border/10 ${config.cellHeight}`}
          >
            {week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isSelected = isSameDay(day, selectedDate);
              const dayEvents = getEventsForDate(day);
              const visibleEvents = dayEvents.slice(0, config.maxEvents);
              const overflowCount = dayEvents.length - config.maxEvents;
              
              return (
                <button
                  key={dayIndex}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateSelect(day);
                  }}
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
                    <div className="w-full flex flex-col gap-0.5 px-0.5 overflow-hidden">
                      {visibleEvents.map((event, idx) => (
                        <div
                          key={event.id || idx}
                          className="w-full bg-kairo-surface-2 border border-border/30 rounded px-1 py-0.5 truncate"
                        >
                          <span className="text-[10px] font-medium text-foreground truncate block leading-tight">
                            {event.title.length > config.titleLength 
                              ? event.title.slice(0, config.titleLength) + '...' 
                              : event.title}
                          </span>
                          <span className="text-[9px] text-primary truncate block leading-tight">
                            {formatEventTime(event)}
                          </span>
                          {config.showLocation && event.location && (
                            <span className="text-[8px] text-muted-foreground truncate block leading-tight">
                              {event.location.length > config.titleLength 
                                ? event.location.slice(0, config.titleLength) + '...' 
                                : event.location}
                            </span>
                          )}
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

  return (
    <div className="flex flex-col h-full px-1 relative">
      {/* Zoom controls */}
      <div className="absolute top-0 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full p-1 border border-border/30">
        <button
          onClick={decreaseZoom}
          disabled={zoomLevel === 1}
          className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-muted-foreground font-medium min-w-[24px] text-center">
          {zoomLevel}x
        </span>
        <button
          onClick={increaseZoom}
          disabled={zoomLevel === 2}
          className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1 border-b border-border/20 pb-2 pt-8">
        {weekdays.map((day, index) => (
          <div key={index} className="text-center text-xs text-muted-foreground font-semibold py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar with scroll when zoomed */}
      {zoomLevel > 1 ? (
        <ScrollArea className="flex-1">
          {calendarContent}
        </ScrollArea>
      ) : (
        <div className="flex-1">
          {calendarContent}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
