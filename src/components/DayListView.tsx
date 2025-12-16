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
    <div className="px-6 space-y-1">
      {days.map((day) => {
        const isTodayDate = isToday(day);
        const dayEvents = getDayEvents(day);
        const hasEvents = dayEvents.length > 0;

        return (
          <button
            key={day.toISOString()}
            onClick={() => hasEvents ? onDateSelect(day) : onAddEvent(day)}
            className={`
              w-full text-left p-4 rounded-2xl transition-all
              ${isTodayDate ? 'bg-primary/10' : 'hover:bg-kairo-surface-2'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`
                  text-2xl font-bold
                  ${isTodayDate ? 'text-primary' : 'text-foreground'}
                `}>
                  {format(day, 'd')}
                </span>
                <span className={`
                  text-sm font-medium
                  ${isTodayDate ? 'text-primary' : 'text-muted-foreground'}
                `}>
                  {format(day, 'EEE', { locale: ptBR })}.
                </span>
              </div>
              
              {hasEvents ? (
                <div className="flex items-center gap-2">
                  {dayEvents.slice(0, 2).map((event, index) => (
                    <div
                      key={event.id}
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${event.priority === 'high' ? 'bg-kairo-red/20 text-kairo-red' : ''}
                        ${event.priority === 'medium' ? 'bg-kairo-amber/20 text-kairo-amber' : ''}
                        ${event.priority === 'low' ? 'bg-kairo-green/20 text-kairo-green' : ''}
                      `}
                    >
                      {event.time}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{dayEvents.length - 2}</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">Sem planos ainda</span>
                  <Plus className="w-4 h-4" />
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
