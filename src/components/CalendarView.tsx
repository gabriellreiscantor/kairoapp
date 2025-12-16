import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

const CalendarView = ({ selectedDate, onDateSelect, currentMonth, onMonthChange }: CalendarViewProps) => {
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Group days into weeks for better layout
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const handleMonthSelect = (monthIndex: number) => {
    onMonthChange(new Date(pickerYear, monthIndex, 1));
    setYearPickerOpen(false);
  };

  const handlePrevYear = () => setPickerYear(prev => prev - 1);
  const handleNextYear = () => setPickerYear(prev => prev + 1);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 px-4 border-b border-border/10">
        {WEEKDAYS.map((day, index) => (
          <div key={index} className="text-center text-xs text-muted-foreground font-medium py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - Full Height */}
      <div className="flex-1 flex flex-col">
        {weeks.map((week, weekIndex) => (
          <div 
            key={weekIndex} 
            className="flex-1 grid grid-cols-7"
          >
            {week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              
              return (
                <button
                  key={dayIndex}
                  onClick={() => onDateSelect(day)}
                  className="flex items-start justify-center pt-3 transition-all active:bg-kairo-surface-2/30"
                >
                  <span
                    className={`
                      w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                      ${!isCurrentMonth ? 'text-muted-foreground/25' : 'text-foreground'}
                      ${isTodayDate ? 'bg-primary text-primary-foreground' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Month Picker Popover */}
      <Popover open={yearPickerOpen} onOpenChange={setYearPickerOpen}>
        <PopoverTrigger className="hidden" />
        <PopoverContent className="w-64 p-3 bg-kairo-surface-2 border-border/30 rounded-xl" align="start">
          {/* Year Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={handlePrevYear}
              className="p-1.5 rounded-lg hover:bg-kairo-surface-3 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-foreground font-semibold text-sm">{pickerYear}</span>
            <button 
              onClick={handleNextYear}
              className="p-1.5 rounded-lg hover:bg-kairo-surface-3 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((month, index) => {
              const isCurrentMonth = currentMonth.getMonth() === index && currentMonth.getFullYear() === pickerYear;
              return (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(index)}
                  className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                    isCurrentMonth 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-foreground hover:bg-kairo-surface-3'
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CalendarView;