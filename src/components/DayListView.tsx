import { format, isToday, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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
            className="w-full text-left py-3 border-b border-border/10 transition-all"
          >
            <div className="flex items-start justify-between">
              <span className={`text-sm font-medium ${isTodayDate ? 'text-primary' : 'text-muted-foreground'}`}>
                {format(day, 'd')} {format(day, 'EEE', { locale: ptBR })}.
              </span>
              
              {hasEvents ? (
                <div className="flex flex-col items-end gap-0.5">
                  {dayEvents.map((event) => (
                    <span key={event.id} className="text-sm text-foreground">
                      {event.time} - {event.title}
                    </span>
                  ))}
                </div>
              ) : isTodayDate ? (
                <span className="text-sm">
                  <span className="text-muted-foreground">Sem planos ainda. </span>
                  <span className="text-foreground font-semibold">Toque para adicionar!</span>
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DayListView;
