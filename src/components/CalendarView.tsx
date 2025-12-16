import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

const CalendarView = ({ selectedDate, onDateSelect }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const today = new Date();

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(new Date(pickerYear, monthIndex, 1));
    setYearPickerOpen(false);
  };

  const handlePrevYear = () => setPickerYear(prev => prev - 1);
  const handleNextYear = () => setPickerYear(prev => prev + 1);

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Popover open={yearPickerOpen} onOpenChange={setYearPickerOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <span className="capitalize">{format(currentMonth, 'MMMM', { locale: ptBR })}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
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
            <div className="grid grid-cols-4 gap-1">
              {MONTHS.map((month, index) => {
                const isCurrentMonth = currentMonth.getMonth() === index && currentMonth.getFullYear() === pickerYear;
                return (
                  <button
                    key={month}
                    onClick={() => handleMonthSelect(index)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-colors ${
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

        {/* Today indicator */}
        <div className="flex items-center gap-1.5 bg-primary/15 rounded-lg px-2 py-1">
          <span className="text-primary font-bold text-sm tabular-nums">{format(today, 'd')}</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day, index) => (
          <div key={index} className="text-center text-[10px] text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isTodayDate = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          
          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all
                ${!isCurrentMonth ? 'text-muted-foreground/25' : 'text-foreground'}
                ${isTodayDate ? 'bg-primary text-primary-foreground' : ''}
                ${isSelected && !isTodayDate ? 'bg-kairo-surface-3 ring-1 ring-primary/40' : ''}
                ${isCurrentMonth && !isTodayDate && !isSelected ? 'hover:bg-kairo-surface-2' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
