import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
}

interface DateDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  events: Event[];
  onAddEvent: () => void;
}

const DateDetailSheet = ({ isOpen, onClose, selectedDate, events, onAddEvent }: DateDetailSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-kairo-surface-1 border-t border-border/20 rounded-t-3xl px-4 pb-8 pt-4"
      >
        <SheetHeader className="flex flex-row items-center justify-between mb-4">
          <SheetTitle className="text-lg font-semibold text-foreground">
            {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </SheetTitle>
          <button 
            onClick={onAddEvent}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 text-primary-foreground" />
          </button>
        </SheetHeader>
        
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event) => (
              <div 
                key={event.id}
                className="flex items-center gap-3 bg-kairo-surface-2 rounded-xl px-4 py-3"
              >
                <div className={`
                  w-1 h-8 rounded-full
                  ${event.priority === 'high' ? 'bg-kairo-red' : ''}
                  ${event.priority === 'medium' ? 'bg-kairo-amber' : ''}
                  ${event.priority === 'low' ? 'bg-kairo-green' : ''}
                `} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button 
            onClick={onAddEvent}
            className="w-full py-6 rounded-xl border border-dashed border-border/40 text-center transition-colors hover:bg-kairo-surface-2/50"
          >
            <p className="text-muted-foreground text-sm">
              Sem planos ainda. <span className="text-foreground font-medium">Toque para adicionar!</span>
            </p>
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DateDetailSheet;