import { useState, useRef, useCallback, useEffect } from "react";
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
  location?: string;
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
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  
  const MIN_SCALE = 1;
  const MAX_SCALE = 3;

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

  // Get distance between two touch points
  const getDistance = (t0: React.Touch, t1: React.Touch) => {
    return Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
  };

  // Get center point between two touches
  const getCenter = (t0: React.Touch, t1: React.Touch) => {
    return {
      x: (t0.clientX + t1.clientX) / 2,
      y: (t0.clientY + t1.clientY) / 2
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScale.current = scale;
      
      const center = getCenter(e.touches[0], e.touches[1]);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setOrigin({
          x: ((center.x - rect.left) / rect.width) * 100,
          y: ((center.y - rect.top) / rect.height) * 100
        });
      }
    } else if (e.touches.length === 1 && scale > 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const ratio = currentDistance / initialDistance.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScale.current * ratio));
      setScale(newScale);
    } else if (e.touches.length === 1 && scale > 1 && lastTouchRef.current) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      
      setTranslate(prev => ({
        x: Math.max(-100, Math.min(100, prev.x + deltaX / scale)),
        y: Math.max(-100, Math.min(100, prev.y + deltaY / scale))
      }));
      
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [isPinching, scale]);

  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
    lastTouchRef.current = null;
    
    // Snap to 1 if close
    if (scale < 1.1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [scale]);

  // Double-tap to toggle zoom
  const lastTapTime = useRef(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      e.preventDefault();
      if (scale > 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setScale(2);
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
          const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
          if (clientX && clientY) {
            setOrigin({
              x: ((clientX - rect.left) / rect.width) * 100,
              y: ((clientY - rect.top) / rect.height) * 100
            });
          }
        }
      }
    }
    lastTapTime.current = now;
  }, [scale]);

  // Reset zoom when month changes
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [currentMonth]);

  const MAX_VISIBLE_EVENTS = 2;

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full px-1 overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleDoubleTap}
    >
      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute top-2 right-2 z-20 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 border border-border/30">
          <span className="text-[10px] text-muted-foreground font-medium">
            {scale.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1 border-b border-border/20 pb-2 shrink-0">
        {weekdays.map((day, index) => (
          <div key={index} className="text-center text-xs text-muted-foreground font-semibold py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Zoomable Calendar Grid */}
      <div 
        ref={contentRef}
        className="flex-1 flex flex-col transition-transform duration-100 ease-out"
        style={{
          transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
          transformOrigin: `${origin.x}% ${origin.y}%`
        }}
      >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateSelect(day);
                  }}
                  className={`
                    relative flex flex-col items-center p-1 transition-all duration-200 
                    ${isCurrentMonth ? '' : 'opacity-30'}
                  `}
                >
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
