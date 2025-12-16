import { format, isToday, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
}

interface DayListViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onAddEvent: (date: Date) => void;
  events: Record<string, Event[]>;
}

const DayListView = ({ selectedDate, onDateSelect, onAddEvent, events }: DayListViewProps) => {
  // Generate next 14 days
  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const getDayEvents = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return events[dateKey] || [];
  };

  return (
    <div className="px-4">
      {days.map((day) => {
        const isTodayDate = isToday(day);
        const dayEvents = getDayEvents(day);
        const hasEvents = dayEvents.length > 0;

        return (
          <button
            key={day.toISOString()}
            onClick={() => hasEvents ? onDateSelect(day) : onAddEvent(day)}
            className={`
              w-full text-left px-3 py-2.5 rounded-lg transition-all
              ${isTodayDate ? 'bg-primary/10' : 'hover:bg-kairo-surface-2/50'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`
                  text-lg font-semibold tabular-nums
                  ${isTodayDate ? 'text-primary' : 'text-foreground'}
                `}>
                  {format(day, 'd')}
                </span>
                <span className={`
                  text-xs font-medium
                  ${isTodayDate ? 'text-primary/80' : 'text-muted-foreground'}
                `}>
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
              </div>
              
              {hasEvents ? (
                <div className="flex items-center gap-1.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`
                        px-2 py-0.5 rounded-md text-[10px] font-semibold
                        ${event.priority === 'high' ? 'bg-kairo-red/15 text-kairo-red' : ''}
                        ${event.priority === 'medium' ? 'bg-kairo-amber/15 text-kairo-amber' : ''}
                        ${event.priority === 'low' ? 'bg-kairo-green/15 text-kairo-green' : ''}
                      `}
                    >
                      {event.time}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground/60">
                  <Plus className="w-3 h-3" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DayListView;
