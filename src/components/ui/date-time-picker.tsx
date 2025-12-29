import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export function DatePicker({ date, onDateChange, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const formatDateDisplay = (date: Date) => {
    return format(date, "d 'de' MMM. 'de' yyyy", { locale: ptBR });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "bg-kairo-surface-3 px-3 py-2 rounded-lg text-sm text-foreground",
            className
          )}
        >
          {formatDateDisplay(date)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background border-border" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            if (newDate) {
              onDateChange(newDate);
              setOpen(false);
            }
          }}
          initialFocus
          locale={ptBR}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

interface TimePickerProps {
  time: string;
  onTimeChange: (time: string) => void;
  className?: string;
}

export function TimePicker({ time, onTimeChange, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Generate hours and minutes options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  
  const [selectedHour, selectedMinute] = time.split(':');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "bg-kairo-surface-3 px-3 py-2 rounded-lg text-sm text-foreground",
            className
          )}
        >
          {time}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background border-border" align="end">
        <div className="flex p-2 max-h-[200px]">
          {/* Hours */}
          <div className="flex flex-col overflow-y-auto pr-2 border-r border-border">
            <span className="text-xs text-muted-foreground px-2 py-1 sticky top-0 bg-background">Hora</span>
            {hours.map((hour) => (
              <button
                key={hour}
                onClick={() => {
                  onTimeChange(`${hour}:${selectedMinute || '00'}`);
                }}
                className={cn(
                  "px-3 py-1.5 text-sm rounded hover:bg-kairo-surface-2 transition-colors",
                  hour === selectedHour && "bg-primary text-primary-foreground"
                )}
              >
                {hour}
              </button>
            ))}
          </div>
          {/* Minutes */}
          <div className="flex flex-col overflow-y-auto pl-2">
            <span className="text-xs text-muted-foreground px-2 py-1 sticky top-0 bg-background">Min</span>
            {minutes.map((minute) => (
              <button
                key={minute}
                onClick={() => {
                  onTimeChange(`${selectedHour || '12'}:${minute}`);
                  setOpen(false);
                }}
                className={cn(
                  "px-3 py-1.5 text-sm rounded hover:bg-kairo-surface-2 transition-colors",
                  minute === selectedMinute && "bg-primary text-primary-foreground"
                )}
              >
                {minute}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
