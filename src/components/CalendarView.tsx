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

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Sample events for demo (dots)
const DEMO_EVENTS: Record<string, string[]> = {
  [format(new Date(), 'yyyy-MM-dd')]: ['primary'],
  [format(new Date(Date.now() + 86400000 * 2), 'yyyy-MM-dd')]: ['emerald'],
  [format(new Date(Date.now() + 86400000 * 5), 'yyyy-MM-dd')]: ['primary', 'emerald'],
};

const CalendarView = ({ selectedDate, onDateSelect, currentMonth }: CalendarViewProps) => {
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

  const getEventDots = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return DEMO_EVENTS[dateKey] || [];
  };

  return (
    <div className="flex flex-col h-full px-2">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day, index) => (
          <div key={index} className="text-center text-xs text-muted-foreground font-medium py-3">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-rows-6 gap-1">
        {weeks.map((week, weekIndex) => (
          <div 
            key={weekIndex} 
            className="grid grid-cols-7"
          >
            {week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isSelected = isSameDay(day, selectedDate);
              const eventDots = getEventDots(day);
              
              return (
                <button
                  key={dayIndex}
                  onClick={() => onDateSelect(day)}
                  className="relative flex flex-col items-center justify-start pt-2 h-full transition-all duration-300 active:scale-95 rounded-xl"
                >
                  {/* Day number */}
                  <span
                    className={`
                      calendar-number w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all duration-300
                      ${!isCurrentMonth ? 'text-muted-foreground/20' : 'text-foreground'}
                      ${isTodayDate && !isSelected ? 'text-primary font-bold' : ''}
                      ${isSelected ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  
                  {/* Underline for today (when not selected) */}
                  {isTodayDate && !isSelected && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                  )}
                  
                  {/* Event dots */}
                  {eventDots.length > 0 && isCurrentMonth && (
                    <div className="flex items-center gap-0.5 mt-1">
                      {eventDots.slice(0, 3).map((color, idx) => (
                        <div 
                          key={idx} 
                          className={`calendar-dot ${
                            color === 'primary' ? 'bg-primary' : 
                            color === 'emerald' ? 'bg-kairo-green' : 'bg-primary'
                          }`}
                        />
                      ))}
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