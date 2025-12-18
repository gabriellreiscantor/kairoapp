import { useState, useRef, useEffect } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
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
  X,
  Send,
  Check
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { EVENT_COLORS, getColorClassName } from "@/lib/event-constants";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  location?: string;
  isAllDay?: boolean;
  emoji?: string;
  color?: string;
}

interface EventDetailPageProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  events: Event[];
  onAddEvent: () => void;
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (eventId: string) => void;
  onNavigateToChat?: (eventId: string, message: string) => void;
}

interface SingleEventCardProps {
  event: Event;
  selectedDate: Date;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onNavigateToChat?: (eventId: string, message: string) => void;
  onClose: () => void;
}

const SingleEventCard = ({
  event,
  selectedDate,
  isExpanded,
  onToggleExpand,
  onDelete,
  onEdit,
  onNavigateToChat,
  onClose
}: SingleEventCardProps) => {
  const [callMeEnabled, setCallMeEnabled] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [selectedColor, setSelectedColor] = useState(event.color || 'primary');

  useEffect(() => {
    if (event.color) {
      setSelectedColor(event.color);
    }
  }, [event.color]);

  const getDateLabel = () => {
    if (isToday(selectedDate)) return 'Hoje';
    return format(selectedDate, "d 'de' MMM", { locale: ptBR });
  };

  const handleColorChange = async (colorId: string) => {
    try {
      await supabase
        .from('events')
        .update({ color: colorId })
        .eq('id', event.id);
      
      setSelectedColor(colorId);
      setShowColorPicker(false);
    } catch (error) {
      console.error('Erro ao atualizar cor:', error);
    }
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-kairo-surface-2 rounded-3xl p-5 relative">
      {/* Title Row */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          {event.emoji && (
            <span className="text-lg">{event.emoji}</span>
          )}
          <h2 className="text-xl font-semibold text-foreground">{event.title}</h2>
        </div>
        <div className="w-12 h-12 bg-background rounded-lg flex flex-col items-center justify-center border border-border/20">
          <span className="text-[8px] text-red-500 font-medium uppercase">
            {format(selectedDate, 'MMM', { locale: ptBR })}
          </span>
          <span className="text-sm font-bold text-foreground">
            {format(selectedDate, 'd')}
          </span>
        </div>
      </div>

      {/* Location */}
      {event.location && (
        <div className="relative">
          <button 
            onClick={() => setShowLocationMenu(!showLocationMenu)}
            className="text-muted-foreground text-sm underline decoration-muted-foreground/50 mb-3 text-left"
          >
            {event.location}
          </button>

          {/* Location Menu */}
          {showLocationMenu && (
            <div className="absolute top-8 left-0 bg-kairo-surface-3 rounded-xl overflow-hidden z-10 shadow-lg border border-border/20 min-w-[180px]">
              <button 
                onClick={() => setShowLocationMenu(false)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-kairo-surface-2 transition-colors"
              >
                <Copy className="w-4 h-4 text-foreground" />
                <span className="text-foreground">Copiar</span>
              </button>
              <button 
                onClick={() => setShowLocationMenu(false)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-kairo-surface-2 transition-colors"
              >
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
          {event.isAllDay ? 'Dia inteiro' : event.time}
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

          {/* Calendar/Color */}
          <button 
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center justify-between py-3 border-t border-border/10 w-full"
          >
            <div className="flex items-center gap-3">
              <span 
                className={`w-4 h-4 rounded-full ${getColorClassName(selectedColor)}`}
              />
              <span className="text-primary">
                {EVENT_COLORS.find(c => c.value === selectedColor)?.label || 'Kairo'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
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
            onClick={onEdit}
            className="w-11 h-11 rounded-full border border-border/30 flex items-center justify-center"
          >
            <Pencil className="w-5 h-5 text-foreground" />
          </button>
        </div>
        <button 
          onClick={onToggleExpand}
          className="w-11 h-11 rounded-full border border-border/30 flex items-center justify-center"
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Color Picker Popup */}
      {showColorPicker && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowColorPicker(false)} 
          />
          <div className="absolute left-0 right-0 top-full mt-2 mx-0 bg-kairo-surface-3 rounded-2xl overflow-hidden shadow-lg z-20 border border-border/20">
            {EVENT_COLORS.map((c) => (
              <button 
                key={c.value} 
                onClick={() => handleColorChange(c.value)} 
                className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full ${c.className}`} />
                  <span className="text-foreground">{c.label}</span>
                </div>
                {selectedColor === c.value && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-x-0 bottom-0 translate-y-full mt-4 bg-kairo-surface-3 rounded-2xl p-4 shadow-lg z-30 border border-border/20">
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
              onClick={handleDeleteConfirm}
              className="flex-1 py-3 rounded-xl bg-transparent text-red-500 font-medium"
            >
              Excluir Evento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SWIPE_THRESHOLD = 100;

const EventDetailPage = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  events, 
  onAddEvent,
  onDeleteEvent,
  onEditEvent,
  onNavigateToChat
}: EventDetailPageProps) => {
  // Track which event is expanded (first one by default)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  
  // Swipe and animation state
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set first event as expanded by default when events change
  useEffect(() => {
    if (events.length > 0 && !expandedEventId) {
      setExpandedEventId(events[0].id);
    }
  }, [events, expandedEventId]);

  // Reset expanded state when closing
  useEffect(() => {
    if (!isOpen) {
      setExpandedEventId(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      onClose();
    }, 300);
  };

  // Touch handlers for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    // Only allow dragging down
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > SWIPE_THRESHOLD) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  if (!isOpen && !isClosing) return null;

  const getDateLabel = () => {
    if (isToday(selectedDate)) return 'Hoje';
    return format(selectedDate, "d 'de' MMM", { locale: ptBR });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (onDeleteEvent) {
      onDeleteEvent(eventId);
    }
    // If we deleted the last event, close the page
    if (events.length === 1) {
      handleClose();
    }
  };

  const handleEditEvent = (eventId: string) => {
    if (onEditEvent) {
      onEditEvent(eventId);
    }
  };

  const handleToggleExpand = (eventId: string) => {
    setExpandedEventId(prev => prev === eventId ? null : eventId);
  };

  // Empty state - no events
  if (events.length === 0) {
    const weekday = format(selectedDate, 'EEEE', { locale: ptBR });
    const dayMonth = format(selectedDate, "d 'de' MMM", { locale: ptBR });
    
    return (
      <div 
        ref={containerRef}
        className={`fixed inset-0 z-50 bg-background transition-transform duration-300 ease-out ${
          isClosing ? 'translate-y-full' : 'animate-slide-up'
        }`}
        style={{ transform: isDragging ? `translateY(${dragY}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex flex-col h-full safe-area-top safe-area-bottom"
          style={{ opacity: isDragging ? Math.max(0.5, 1 - dragY / 300) : 1 }}
        >
          {/* Header with handle bar and close button */}
          <div className="flex items-center justify-between px-4">
            <div className="w-10" />
            <div className="w-10 h-1 bg-muted-foreground/50 rounded-full my-3" />
            <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center">
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          {/* Date Display */}
          <div className="px-4 pt-4">
            <h1 className="text-2xl font-bold text-foreground capitalize">
              {weekday}, {dayMonth}.
            </h1>
          </div>

          <div className="flex-1 flex items-center justify-center px-4">
            <button 
              onClick={onAddEvent}
              className="w-full py-8 rounded-2xl border border-dashed border-border/40 text-center transition-colors hover:bg-kairo-surface-2/50"
            >
              <p className="text-muted-foreground text-sm">
                Você ainda não adicionou um evento. <span className="text-primary font-medium">Toque aqui para adicionar.</span>
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-50 bg-background overflow-hidden transition-transform duration-300 ease-out ${
        isClosing ? 'translate-y-full' : 'animate-slide-up'
      }`}
      style={{ transform: isDragging ? `translateY(${dragY}px)` : undefined }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-background to-background pointer-events-none" />
      
      <div 
        className="relative flex flex-col h-full"
        style={{ opacity: isDragging ? Math.max(0.5, 1 - dragY / 300) : 1 }}
      >
        {/* Header with handle bar and close button */}
        <div className="flex items-center justify-between px-4 safe-area-top">
          <div className="w-10" />
          <div className="w-10 h-1 bg-muted-foreground/50 rounded-full my-3" />
          <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center">
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Events List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {events.map((event) => (
            <SingleEventCard
              key={event.id}
              event={event}
              selectedDate={selectedDate}
              isExpanded={expandedEventId === event.id}
              onToggleExpand={() => handleToggleExpand(event.id)}
              onDelete={() => handleDeleteEvent(event.id)}
              onEdit={() => handleEditEvent(event.id)}
              onNavigateToChat={onNavigateToChat}
              onClose={handleClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
