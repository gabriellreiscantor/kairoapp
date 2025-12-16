import { useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Phone, 
  Bell, 
  Trash2, 
  Pencil, 
  ChevronUp, 
  ChevronDown,
  Mic,
  Copy,
  Navigation,
  Check
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  location?: string;
  isAllDay?: boolean;
  emoji?: string;
}

interface DateDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  events: Event[];
  onAddEvent: () => void;
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (eventId: string) => void;
}

const COLORS = [
  { id: 'none', color: 'transparent', border: true },
  { id: 'red', color: '#EF4444' },
  { id: 'orange', color: '#F97316' },
  { id: 'amber', color: '#F59E0B' },
  { id: 'yellow', color: '#EAB308' },
  { id: 'lime', color: '#84CC16' },
  { id: 'green', color: '#22C55E' },
  { id: 'cyan', color: '#06B6D4' },
  { id: 'blue', color: '#3B82F6' },
  { id: 'violet', color: '#8B5CF6' },
  { id: 'purple', color: '#A855F7' },
  { id: 'pink', color: '#EC4899' },
];

const CALENDARS = [
  { id: 'kairo', name: 'Kairo', color: '#F97316' },
  { id: 'example', name: 'Exemplo de cronograma', color: '#EF4444' },
];

const DateDetailSheet = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  events, 
  onAddEvent,
  onDeleteEvent,
  onEditEvent 
}: DateDetailSheetProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [callMeEnabled, setCallMeEnabled] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState('kairo');
  const [editInput, setEditInput] = useState('');

  const currentEvent = events[0]; // For now, show first event

  const getDateLabel = () => {
    if (isToday(selectedDate)) return 'Hoje';
    return format(selectedDate, "d 'de' MMM", { locale: ptBR });
  };

  const handleDelete = () => {
    if (currentEvent && onDeleteEvent) {
      onDeleteEvent(currentEvent.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleEdit = () => {
    if (currentEvent && onEditEvent) {
      onEditEvent(currentEvent.id);
    }
  };

  if (!currentEvent) {
    // Show empty state
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          className="bg-kairo-surface-1 border-t border-border/20 rounded-t-3xl px-4 pb-8 pt-2"
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
          <button 
            onClick={onAddEvent}
            className="w-full py-8 rounded-2xl border border-dashed border-border/40 text-center transition-colors hover:bg-kairo-surface-2/50"
          >
            <p className="text-muted-foreground text-sm">
              Sem planos ainda. <span className="text-foreground font-medium">Toque para adicionar!</span>
            </p>
          </button>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-transparent border-0 px-0 pb-0 pt-0 max-h-[95vh]"
      >
        <div className="flex flex-col h-full">
          {/* Handle */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 bg-muted-foreground/50 rounded-full" />
          </div>

          {/* Event Card */}
          <div className="mx-4 bg-kairo-surface-2 rounded-3xl p-5 relative">
            {/* Title Row */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {currentEvent.emoji && (
                  <span className="text-lg">{currentEvent.emoji}</span>
                )}
                <h2 className="text-xl font-semibold text-foreground">{currentEvent.title}</h2>
              </div>
              <div className="w-12 h-12 bg-background rounded-lg flex flex-col items-center justify-center border border-border/20">
                <span className="text-[8px] text-red-500 font-medium">JUL</span>
                <span className="text-sm font-bold text-foreground">17</span>
              </div>
            </div>

            {/* Location */}
            {currentEvent.location && (
              <div className="relative">
                <button 
                  onClick={() => setShowLocationMenu(!showLocationMenu)}
                  className="text-muted-foreground text-sm underline decoration-muted-foreground/50 mb-3"
                >
                  {currentEvent.location}
                </button>

                {/* Location Menu */}
                {showLocationMenu && (
                  <div className="absolute top-8 left-0 bg-kairo-surface-3 rounded-xl overflow-hidden z-10 shadow-lg border border-border/20 min-w-[180px]">
                    <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-kairo-surface-2 transition-colors">
                      <Copy className="w-4 h-4 text-foreground" />
                      <span className="text-foreground">Copiar</span>
                    </button>
                    <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-kairo-surface-2 transition-colors">
                      <Navigation className="w-4 h-4 text-foreground" />
                      <span className="text-foreground">Encontrar no Mapas</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Date Row */}
            <div className="flex items-center justify-between py-3 border-t border-border/10">
              <span className="text-foreground">{getDateLabel()}</span>
              <span className="text-muted-foreground">
                {currentEvent.isAllDay ? 'Dia inteiro' : currentEvent.time}
              </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <>
                {/* Call Me Toggle */}
                <div className="flex items-center justify-between py-3 border-t border-border/10">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">Me Ligue</span>
                  </div>
                  <Switch checked={callMeEnabled} onCheckedChange={setCallMeEnabled} />
                </div>

                {/* Alert */}
                <button className="flex items-center justify-between py-3 border-t border-border/10 w-full">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">23:45, 1 dia antes</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Calendar */}
                <button 
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex items-center justify-between py-3 border-t border-border/10 w-full"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: CALENDARS.find(c => c.id === selectedCalendar)?.color }}
                    />
                    <span className="text-primary">
                      {CALENDARS.find(c => c.id === selectedCalendar)?.name}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Color Picker Popup */}
                {showColorPicker && (
                  <div className="absolute left-4 right-4 bg-kairo-surface-3 rounded-2xl p-4 shadow-lg z-20 border border-border/20">
                    <p className="text-muted-foreground text-sm mb-3">Cor do Evento</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {COLORS.map((color) => (
                        <button
                          key={color.id}
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            color.border ? 'border-2 border-muted-foreground' : ''
                          }`}
                          style={{ backgroundColor: color.color }}
                        >
                          {color.id === 'none' && (
                            <div className="w-6 h-0.5 bg-muted-foreground rotate-45" />
                          )}
                        </button>
                      ))}
                    </div>
                    
                    <p className="text-muted-foreground text-xs mb-2">Kairo</p>
                    {CALENDARS.map((calendar) => (
                      <button
                        key={calendar.id}
                        onClick={() => {
                          setSelectedCalendar(calendar.id);
                          setShowColorPicker(false);
                        }}
                        className="w-full flex items-center justify-between py-3 border-t border-border/10"
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: calendar.color }}
                          />
                          <span className="text-foreground">{calendar.name}</span>
                        </div>
                        {selectedCalendar === calendar.id && (
                          <div className="w-5 h-5 rounded-full border-2 border-foreground flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-11 h-11 rounded-full border border-border/30 flex items-center justify-center"
                >
                  <Trash2 className="w-5 h-5 text-foreground" />
                </button>
                <button 
                  onClick={handleEdit}
                  className="w-11 h-11 rounded-full border border-border/30 flex items-center justify-center"
                >
                  <Pencil className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-11 h-11 rounded-full border border-border/30 flex items-center justify-center"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-foreground" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-foreground" />
                )}
              </button>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="absolute inset-x-4 bottom-4 bg-kairo-surface-3 rounded-2xl p-4 shadow-lg z-30 border border-border/20">
                <p className="text-foreground text-center mb-4">
                  Tem certeza de que deseja excluir este evento?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-kairo-surface-2 text-foreground font-medium"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl bg-transparent text-red-500 font-medium"
                  >
                    Excluir Evento
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom Actions */}
          <div className="px-4 pb-4 safe-area-bottom">
            {/* Quick Action Buttons */}
            <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar pb-1">
              <button className="flex-shrink-0 px-4 py-3 rounded-xl bg-kairo-surface-2 text-foreground text-sm font-medium whitespace-nowrap">
                Adiar para daqui a 1 hora
              </button>
              <button className="flex-shrink-0 px-4 py-3 rounded-xl bg-kairo-surface-2 text-foreground text-sm font-medium whitespace-nowrap">
                Me ligue
              </button>
              <button className="flex-shrink-0 px-4 py-3 rounded-xl bg-kairo-surface-2 text-foreground text-sm font-medium whitespace-nowrap">
                Notificar
              </button>
            </div>

            {/* Edit Input */}
            <div className="flex items-center gap-3 bg-kairo-surface-2 rounded-2xl px-4 py-3">
              <input
                type="text"
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                placeholder="Editar este evento"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
              />
              <button className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                <Mic className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DateDetailSheet;
