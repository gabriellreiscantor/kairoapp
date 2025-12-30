import { useState, useRef, useEffect } from "react";
import { format, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
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

// Get dot color class for timeline
const getTimelineDotColor = (color: string) => {
  const colorMap: Record<string, string> = {
    'primary': 'bg-primary',
    'red': 'bg-red-500',
    'orange': 'bg-orange-500',
    'yellow': 'bg-yellow-500',
    'green': 'bg-green-500',
    'blue': 'bg-blue-500',
    'purple': 'bg-purple-500',
    'pink': 'bg-pink-500',
  };
  return colorMap[color] || 'bg-primary';
};

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
  const { t } = useLanguage();
  const [callMeEnabled, setCallMeEnabled] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedColor, setSelectedColor] = useState(event.color || 'primary');

  useEffect(() => {
    if (event.color) {
      setSelectedColor(event.color);
    }
  }, [event.color]);

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
    <div className="relative">
      {/* Main Content */}
      <div 
        className={`relative transition-all duration-200 ${isExpanded ? 'pb-4' : ''}`}
        onClick={onToggleExpand}
      >
        {/* Timeline Layout */}
        <div className="flex gap-5">
          {/* Time Column */}
          <div className="w-14 flex-shrink-0 text-right pt-1">
            <span className="text-sm font-semibold text-foreground">
              {event.isAllDay ? 'Dia' : event.time?.split(':')[0] || '--'}
            </span>
            {!event.isAllDay && event.time && (
              <span className="text-sm font-semibold text-muted-foreground">
                :{event.time.split(':')[1]}
              </span>
            )}
          </div>

          {/* Timeline Dot & Line */}
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${getTimelineDotColor(selectedColor)} ring-4 ring-background shadow-lg`} />
            <div className="w-0.5 flex-1 bg-border/50 mt-2" />
          </div>

          {/* Event Content */}
          <div className="flex-1 pb-8 min-w-0">
            {/* Emoji Hero */}
            <div className="mb-3">
              <span className="text-5xl">{event.emoji || '📅'}</span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-foreground leading-tight mb-1">
              {event.title}
            </h3>

            {/* Duration badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground mb-3">
              <span>{event.isAllDay ? t('event.allDay') : `${event.time}`}</span>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Navigation className="w-3.5 h-3.5" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* Expanded Options */}
            {isExpanded && (
              <div className="mt-4 space-y-1" onClick={(e) => e.stopPropagation()}>
                {/* Call Me */}
                <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Me Ligue</span>
                  </div>
                  <Switch checked={callMeEnabled} onCheckedChange={setCallMeEnabled} />
                </div>

                {/* Alert */}
                <button className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors w-full">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">23:45, 1 dia antes</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Color */}
                <button 
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors w-full relative"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getTimelineDotColor(selectedColor)}`} />
                    <span className="text-sm text-foreground">
                      {t(EVENT_COLORS.find(c => c.value === selectedColor)?.labelKey || 'color.horah')}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Color Picker */}
                {showColorPicker && (
                  <div className="bg-card rounded-xl overflow-hidden shadow-lg border border-border/30 mt-2">
                    {EVENT_COLORS.map((c) => (
                      <button 
                        key={c.value} 
                        onClick={() => handleColorChange(c.value)} 
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full ${c.className}`} />
                          <span className="text-sm text-foreground">{t(c.labelKey)}</span>
                        </div>
                        {selectedColor === c.value && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3">
                  <button 
                    onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-sm">Editar</span>
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className="w-full max-w-md bg-card rounded-2xl p-5 shadow-xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-foreground text-center mb-5 font-medium">
              Excluir "{event.title}"?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="flex-1 py-3.5 rounded-xl bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors"
              >
                Excluir
              </button>
            </div>
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

  // Sort events by time (earliest first, all-day events at the end)
  const sortedEvents = [...events].sort((a, b) => {
    // All-day events go to the end
    if (a.isAllDay && !b.isAllDay) return 1;
    if (!a.isAllDay && b.isAllDay) return -1;
    if (a.isAllDay && b.isAllDay) return 0;
    
    // Sort by time
    const timeA = a.time || '23:59';
    const timeB = b.time || '23:59';
    return timeA.localeCompare(timeB);
  });

  // Set first event as expanded by default when events change
  useEffect(() => {
    if (sortedEvents.length > 0 && !expandedEventId) {
      setExpandedEventId(sortedEvents[0].id);
    }
  }, [sortedEvents, expandedEventId]);

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

  // Touch handlers for swipe gesture - apenas no header
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
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

  const { t, getDateLocale } = useLanguage();
  const dateLocale = getDateLocale();

  const getDateLabel = () => {
    if (isToday(selectedDate)) return t('common.today');
    return format(selectedDate, t('event.dateFormatShort'), { locale: dateLocale });
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
    const weekday = format(selectedDate, 'EEEE', { locale: dateLocale });
    const dayNumber = format(selectedDate, 'd', { locale: dateLocale });
    const monthYear = format(selectedDate, t('event.dateFormat'), { locale: dateLocale });
    
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
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3">
            <div className="w-10" />
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Big Date Display */}
          <div className="px-6 pt-8 pb-6">
            <p className="text-sm text-muted-foreground capitalize mb-1">{weekday}</p>
            <h1 className="text-6xl font-bold text-foreground mb-1">{dayNumber}</h1>
            <p className="text-lg text-muted-foreground capitalize">{monthYear}</p>
          </div>

          <div className="flex-1 flex items-center justify-center px-6">
            <button 
              onClick={onAddEvent}
              className="w-full py-12 rounded-3xl border-2 border-dashed border-border/40 text-center transition-all hover:border-primary/50 hover:bg-primary/5 group"
            >
              <div className="text-5xl mb-4">📝</div>
              <p className="text-muted-foreground">
                {t('calendar.noEvents')}
              </p>
              <p className="text-primary font-medium mt-1 group-hover:underline">
                {t('common.add')}
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const weekday = format(selectedDate, 'EEEE', { locale: dateLocale });
  const dayNumber = format(selectedDate, 'd', { locale: dateLocale });
  const monthYear = format(selectedDate, t('event.dateFormat'), { locale: dateLocale });

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-50 bg-background overflow-hidden transition-transform duration-300 ease-out ${
        isClosing ? 'translate-y-full' : 'animate-slide-up'
      }`}
      style={{ transform: isDragging ? `translateY(${dragY}px)` : undefined }}
    >
      <div 
        className="relative flex flex-col h-full"
        style={{ opacity: isDragging ? Math.max(0.5, 1 - dragY / 300) : 1 }}
      >
        {/* Header - Área de arraste para fechar */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center justify-between px-5 pt-3 safe-area-top">
            <div className="w-10" />
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Big Date Header */}
          <div className="px-6 pt-6 pb-4">
            <p className="text-sm text-muted-foreground capitalize mb-1">{weekday}</p>
            <h1 className="text-5xl font-bold text-foreground mb-1">{dayNumber}</h1>
            <p className="text-base text-muted-foreground capitalize">{monthYear}</p>
          </div>

          {/* Events Count */}
          <div className="px-6 pb-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {sortedEvents.length} {sortedEvents.length === 1 ? 'evento' : 'eventos'}
            </span>
          </div>
        </div>

        {/* Timeline Events */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {sortedEvents.map((event) => (
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
