import { format, isToday, addDays, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  isAllDay?: boolean;
  endDate?: Date;
}

interface DayListViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onAddEvent: (date: Date) => void;
  events: Record<string, Event[]>;
}

const DayListView = ({ selectedDate, onDateSelect, onAddEvent, events }: DayListViewProps) => {
  // Generate days from start of current month to end + some extra days
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  // Get all days of the current month plus next 7 days
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const extraDays = Array.from({ length: 14 }, (_, i) => addDays(monthEnd, i + 1));
  const days = [...monthDays, ...extraDays];

  const getDayEvents = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return events[dateKey] || [];
  };

  // Format weekday abbreviation in Portuguese
  const formatWeekday = (date: Date) => {
    const weekday = format(date, 'EEEE', { locale: ptBR });
    // Get first 3 letters and add period
    return weekday.slice(0, 3) + '.';
  };

  return (
    <div className="px-4">
      {days.map((day) => {
        const isTodayDate = isToday(day);
        const dayEvents = getDayEvents(day);
        const hasEvents = dayEvents.length > 0;

        return (
          <div key={day.toISOString()} className="py-2">
            {/* Date Header */}
            <button
              onClick={() => hasEvents ? onDateSelect(day) : onAddEvent(day)}
              className={`text-sm font-medium mb-1 ${
                isTodayDate ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              {format(day, 'd')} {formatWeekday(day)}
            </button>

            {/* Event Cards */}
            {hasEvents && (
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onDateSelect(day)}
                    className="w-full bg-kairo-surface-2 rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
                  >
                    <h3 className="text-foreground font-medium mb-2">{event.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm text-muted-foreground">
                          {event.isAllDay ? 'Dia inteiro' : event.time}
                        </span>
                      </div>
                      {event.endDate && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CalendarIcon className="w-4 h-4" />
                          <span className="text-xs">{format(event.endDate, 'd')}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DayListView;
