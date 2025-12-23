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
import { Haptics, ImpactStyle } from '@capacitor/haptics';
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
  
  // Visual scale = CSS transform during pinch (immediate visual feedback)
  // Applied scale = actual cell dimensions after pinch ends
  const [visualScale, setVisualScale] = useState(1.5);
  const [appliedScale, setAppliedScale] = useState(1.5);
  const [isPinching, setIsPinching] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [isBouncing, setIsBouncing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const isPinchingRef = useRef(false);
  const hasHitLimit = useRef(false);
  
  const MIN_SCALE = 1;
  const MAX_SCALE = 2.5;

  // Haptic feedback when hitting zoom limits
  const triggerHapticFeedback = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Silently fail on web/unsupported platforms
    }
  }, []);
  
  // Current scale for calculations
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
      setIsPinching(true);
      isPinchingRef.current = true;
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScale.current = appliedScale;
      setVisualScale(appliedScale);
      
      // Set transform origin to center of pinch
      const center = getCenter(e.touches[0], e.touches[1]);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setOrigin({
          x: ((center.x - rect.left) / rect.width) * 100,
          y: ((center.y - rect.top) / rect.height) * 100
        });
      }
    }
  }, [appliedScale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const ratio = currentDistance / initialDistance.current;
      const rawScale = initialScale.current * ratio;
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));
      
      // Trigger haptic when hitting limits (only once per limit hit)
      if ((rawScale <= MIN_SCALE || rawScale >= MAX_SCALE) && !hasHitLimit.current) {
        hasHitLimit.current = true;
        triggerHapticFeedback();
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 150);
      } else if (rawScale > MIN_SCALE && rawScale < MAX_SCALE) {
        hasHitLimit.current = false;
      }
      
      setVisualScale(clampedScale);
    }
  }, [isPinching, triggerHapticFeedback]);

  const handleTouchEnd = useCallback(() => {
    if (isPinching) {
      // Apply visual scale to actual dimensions
      setAppliedScale(visualScale);
    }
    setIsPinching(false);
    isPinchingRef.current = false;
    hasHitLimit.current = false;
  }, [isPinching, visualScale]);

  // Double tap to toggle zoom
  const lastTapTime = useRef(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      e.preventDefault();
      const newScale = appliedScale > 1.2 ? 1 : 1.5;
      setAppliedScale(newScale);
      setVisualScale(newScale);
    }
    lastTapTime.current = now;
  }, [appliedScale]);

  // Mouse wheel zoom - with Ctrl/Cmd key for zoom, otherwise normal scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only zoom if Ctrl/Cmd is pressed, otherwise allow normal scroll
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const rawNewScale = appliedScale + delta;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawNewScale));
      
      // Haptic feedback when hitting limits
      if (rawNewScale <= MIN_SCALE || rawNewScale >= MAX_SCALE) {
        triggerHapticFeedback();
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 150);
      }
      
      setAppliedScale(newScale);
      setVisualScale(newScale);
    }
  }, [appliedScale, triggerHapticFeedback]);

  // Native touch listener to prevent scroll during pinch
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

  // Cell height based on APPLIED scale (actual dimensions)
  const baseCellHeight = 80;
  const cellHeight = baseCellHeight + (appliedScale - 1) * 60;

  // Event display config based on scale
  const getEventConfig = () => {
    if (scale >= 2) return { 
      titleLength: 50, 
      fontSize: 'text-xs', 
      showLocation: true,
      showTime: true
    };
    if (scale >= 1.5) return { 
      titleLength: 20, 
      fontSize: 'text-[11px]', 
      showLocation: true,
      showTime: true
    };
    return { 
      titleLength: 8, 
      fontSize: 'text-[10px]', 
      showLocation: false,
      showTime: true
    };
  };
  
  const eventConfig = getEventConfig();

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full px-1 overflow-hidden touch-manipulation"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Zoom indicator */}
      {appliedScale !== 1.5 && (
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

      {/* Scrollable Calendar Grid with visual transform during pinch */}
      <div 
        ref={contentRef}
        className={`flex-1 ${isPinching ? 'overflow-hidden' : 'overflow-auto'} ${isBouncing ? 'animate-pulse' : ''}`}
        style={{
          // During pinch: apply visual transform for immediate feedback
          transform: isPinching 
            ? `scale(${visualScale / appliedScale})` 
            : isBouncing 
              ? 'scale(0.98)' 
              : 'none',
          transformOrigin: `${origin.x}% ${origin.y}%`,
          transition: isPinching ? 'none' : 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div className="flex flex-col">
          {weeks.map((week, weekIndex) => (
            <div 
              key={weekIndex} 
              className="grid grid-cols-7 border-b border-border/10"
            >
              {week.map((day, dayIndex) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const isSelected = isSameDay(day, selectedDate);
                const dayEvents = getEventsForDate(day);
                
                return (
                  <button
                    key={dayIndex}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateSelect(day);
                    }}
                    onTouchEnd={(e) => {
                      // Fallback para iOS que às vezes não dispara onClick
                      e.stopPropagation();
                      // Usar setTimeout para evitar double-fire com onClick
                      const now = Date.now();
                      if (now - lastTapTime.current > 350) {
                        onDateSelect(day);
                      }
                    }}
                    className={`
                      relative flex flex-col items-start p-1 transition-all duration-200 border-r border-border/5 last:border-r-0
                      ${isCurrentMonth ? '' : 'opacity-50'}
                    `}
                    style={{ 
                      minHeight: `${cellHeight}px`,
                      height: 'auto',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
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
                    
                    {/* Events - limit to 3 visible */}
                    {isCurrentMonth && dayEvents.length > 0 && (
                      <div className="w-full flex flex-col gap-0.5 flex-1">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={event.id || idx}
                            className="w-full bg-kairo-surface-2 border border-border/30 rounded px-1 py-0.5"
                          >
                            <span 
                              className={`${eventConfig.fontSize} font-medium text-foreground block leading-tight truncate`}
                            >
                              {event.title.length > eventConfig.titleLength 
                                ? event.title.slice(0, eventConfig.titleLength) + '...' 
                                : event.title}
                            </span>
                            {eventConfig.showTime && (
                              <span className="text-[9px] text-primary truncate block leading-tight">
                                {formatEventTime(event)}
                              </span>
                            )}
                            {eventConfig.showLocation && event.location && (
                              <span className="text-[9px] text-muted-foreground block leading-tight truncate">
                                {event.location.length > eventConfig.titleLength 
                                  ? event.location.slice(0, eventConfig.titleLength) + '...' 
                                  : event.location}
                              </span>
                            )}
                          </div>
                        ))}
                        {/* Show "+X mais" indicator for additional events */}
                        {dayEvents.length > 3 && (
                          <div 
                            className="w-full text-center py-0.5 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            +{dayEvents.length - 3} mais
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
