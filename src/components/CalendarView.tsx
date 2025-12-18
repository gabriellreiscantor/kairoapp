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
  
  // Visual scale = feedback during pinch gesture (transform: scale)
  // Applied scale = actual dimensions after pinch ends
  const [visualScale, setVisualScale] = useState(1);
  const [appliedScale, setAppliedScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const scrollPositionRef = useRef({ top: 0, left: 0 });
  const isPinchingRef = useRef(false);
  
  const MIN_SCALE = 1;
  const MAX_SCALE = 3;
  
  // Combined scale for calculations
  const scale = isPinching ? visualScale : appliedScale;

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
      e.stopPropagation();
      
      // Save scroll position before pinch
      if (contentRef.current) {
        scrollPositionRef.current = {
          top: contentRef.current.scrollTop,
          left: contentRef.current.scrollLeft
        };
      }
      
      setIsPinching(true);
      isPinchingRef.current = true;
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScale.current = appliedScale;
      setVisualScale(appliedScale);
      
      const center = getCenter(e.touches[0], e.touches[1]);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setOrigin({
          x: ((center.x - rect.left) / rect.width) * 100,
          y: ((center.y - rect.top) / rect.height) * 100
        });
      }
    } else if (e.touches.length === 1 && appliedScale > 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [appliedScale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const ratio = currentDistance / initialDistance.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScale.current * ratio));
      setVisualScale(newScale);
    } else if (e.touches.length === 1 && appliedScale > 1 && lastTouchRef.current) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      
      setTranslate(prev => ({
        x: Math.max(-100, Math.min(100, prev.x + deltaX / appliedScale)),
        y: Math.max(-100, Math.min(100, prev.y + deltaY / appliedScale))
      }));
      
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [isPinching, appliedScale]);

  const handleTouchEnd = useCallback(() => {
    if (isPinching) {
      // Apply the visual scale to actual dimensions
      const finalScale = visualScale < 1.1 ? 1 : visualScale;
      setAppliedScale(finalScale);
      setVisualScale(finalScale);
      if (finalScale === 1) {
        setTranslate({ x: 0, y: 0 });
      }
    }
    setIsPinching(false);
    isPinchingRef.current = false;
    lastTouchRef.current = null;
  }, [isPinching, visualScale]);

  const lastTapTime = useRef(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      e.preventDefault();
      if (appliedScale > 1) {
        setAppliedScale(1);
        setVisualScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setAppliedScale(2);
        setVisualScale(2);
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
  }, [appliedScale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, appliedScale + delta));
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOrigin({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100
      });
    }
    
    const finalScale = newScale <= 1.05 ? 1 : newScale;
    setAppliedScale(finalScale);
    setVisualScale(finalScale);
    
    if (finalScale === 1) {
      setTranslate({ x: 0, y: 0 });
    }
  }, [appliedScale]);

  // Reset zoom when month changes
  useEffect(() => {
    setAppliedScale(1);
    setVisualScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [currentMonth]);

  // Native touch listener with { passive: false } to properly block scroll during pinch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinchingRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    container.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    
    return () => {
      container.removeEventListener('touchmove', handleNativeTouchMove);
      container.removeEventListener('touchstart', handleNativeTouchStart);
    };
  }, []);

  // Smaller base cell height for compact default view
  const baseCellHeight = 60;
  const cellHeight = baseCellHeight + (appliedScale - 1) * 60; // 60px at 1x, 120px at 2x, 180px at 3x

  // Dynamic config based on zoom - expand vertically at higher zoom
  const getEventConfig = () => {
    if (scale >= 2.5) return { 
      titleLength: 100, 
      fontSize: 'text-sm', 
      showLocation: true, 
      maxEvents: 999, // Show ALL events
      truncate: false,
      maxLines: 3
    };
    if (scale >= 2) return { 
      titleLength: 50, 
      fontSize: 'text-xs', 
      showLocation: true, 
      maxEvents: 999, // Show ALL events
      truncate: false,
      maxLines: 2
    };
    if (scale >= 1.5) return { 
      titleLength: 20, 
      fontSize: 'text-[11px]', 
      showLocation: true, 
      maxEvents: 5,
      truncate: true,
      maxLines: 1
    };
    return { 
      titleLength: 6, 
      fontSize: 'text-[10px]', 
      showLocation: false, 
      maxEvents: 2,
      truncate: true,
      maxLines: 1
    };
  };
  
  const eventConfig = getEventConfig();

  const MAX_VISIBLE_EVENTS = eventConfig.maxEvents;

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full px-1 overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onClick={handleDoubleTap}
    >
      {/* Zoom indicator */}
      {appliedScale > 1 && (
        <div className="absolute top-2 right-2 z-20 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 border border-border/30">
          <span className="text-[10px] text-muted-foreground font-medium">
            {appliedScale.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Weekday Headers - Fixed */}
      <div className="grid grid-cols-7 mb-1 border-b border-border/20 pb-2 shrink-0">
        {weekdays.map((day, index) => (
          <div key={index} className="text-center text-xs text-muted-foreground font-semibold py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Scrollable Calendar Grid with visual zoom during pinch */}
      <div 
        ref={contentRef}
        className={`flex-1 ${isPinching ? 'overflow-hidden' : 'overflow-auto'}`}
        style={{
          transform: isPinching ? `scale(${visualScale / appliedScale})` : 'none',
          transformOrigin: `${origin.x}% ${origin.y}%`,
          transition: isPinching ? 'none' : 'transform 0.2s ease-out',
          touchAction: isPinching ? 'none' : 'pan-y'
        }}
      >
        <div className="flex flex-col" style={{ minHeight: appliedScale > 1 ? `${weeks.length * cellHeight}px` : '100%' }}>
          {weeks.map((week, weekIndex) => (
            <div 
              key={weekIndex} 
              className="grid grid-cols-7 border-b border-border/10"
              style={{ 
                minHeight: `${cellHeight}px`,
                height: appliedScale >= 2 ? 'auto' : `${cellHeight}px`
              }}
            >
              {week.map((day, dayIndex) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const isSelected = isSameDay(day, selectedDate);
                const dayEvents = getEventsForDate(day);
                const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                const overflowCount = Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS);
                
                return (
                  <button
                    key={dayIndex}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateSelect(day);
                    }}
                    className={`
                      relative flex flex-col items-start p-1 transition-all duration-200 border-r border-border/5 last:border-r-0
                      ${isCurrentMonth ? '' : 'opacity-30'}
                    `}
                    style={{ minHeight: `${cellHeight}px` }}
                  >
                    {/* Date number */}
                    <span
                      className={`
                        calendar-number flex items-center justify-center rounded-full mb-1 transition-all duration-200 shrink-0
                        ${scale >= 2 ? 'w-8 h-8 text-base' : 'w-7 h-7 text-sm'}
                        ${!isCurrentMonth ? 'text-muted-foreground/40' : 'text-foreground'}
                        ${isTodayDate ? 'bg-primary text-primary-foreground font-bold' : ''}
                        ${isSelected && !isTodayDate ? 'bg-muted text-foreground font-medium' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    
                    {/* Events - expand to show all when zoomed */}
                    {isCurrentMonth && dayEvents.length > 0 && (
                      <div className="w-full flex flex-col gap-0.5 flex-1">
                        {visibleEvents.map((event, idx) => (
                          <div
                            key={event.id || idx}
                            className="w-full bg-kairo-surface-2 border border-border/30 rounded px-1 py-0.5"
                          >
                            <span 
                              className={`${eventConfig.fontSize} font-medium text-foreground block leading-tight`}
                              style={!eventConfig.truncate ? {
                                display: '-webkit-box',
                                WebkitLineClamp: eventConfig.maxLines,
                                WebkitBoxOrient: 'vertical' as const,
                                overflow: 'hidden',
                                whiteSpace: 'normal'
                              } : { 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {eventConfig.truncate 
                                ? (event.title.length > eventConfig.titleLength 
                                    ? event.title.slice(0, eventConfig.titleLength) + '...' 
                                    : event.title)
                                : event.title}
                            </span>
                            <span className={`${scale >= 1.5 ? 'text-[10px]' : 'text-[9px]'} text-primary truncate block leading-tight`}>
                              {formatEventTime(event)}
                            </span>
                            {eventConfig.showLocation && event.location && (
                              <span 
                                className="text-[9px] text-muted-foreground block leading-tight"
                                style={!eventConfig.truncate ? {
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical' as const,
                                  overflow: 'hidden',
                                  whiteSpace: 'normal'
                                } : {
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {eventConfig.truncate 
                                  ? (event.location.length > eventConfig.titleLength 
                                      ? event.location.slice(0, eventConfig.titleLength) + '...' 
                                      : event.location)
                                  : event.location}
                              </span>
                            )}
                          </div>
                        ))}
                        
                        {/* Only show overflow indicator when not showing all events */}
                        {overflowCount > 0 && (
                          <div className="text-center shrink-0">
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
    </div>
  );
};

export default CalendarView;
