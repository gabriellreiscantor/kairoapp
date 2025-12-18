import React, { useState, useEffect } from "react";
import { 
  Calendar, Bell, Phone, MapPin, CheckCircle, ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { scheduleCallAlert, cancelCallAlert, getCallAlertTime } from "@/hooks/useCallAlertScheduler";
import { getColorClassName } from "@/lib/event-constants";

interface EventCreatedCardProps {
  event: {
    id?: string;
    title: string;
    description?: string;
    event_date: string;
    event_time?: string;
    duration_minutes?: number;
    location?: string;
    category?: string;
    notification_enabled?: boolean;
    call_alert_enabled?: boolean;
    emoji?: string;
    color?: string;
    is_all_day?: boolean;
    _createdAt?: number;
  };
  type?: 'created' | 'updated';
  onEdit?: (eventId: string) => void;
}

const EventCreatedCard = React.forwardRef<HTMLDivElement, EventCreatedCardProps>(
  ({ event, type = 'created', onEdit }, ref) => {
  
  // Calculate if event was just created (within 15 seconds)
  const isRecentlyCreated = event._createdAt ? (Date.now() - event._createdAt < 15000) : false;
  
  // Hooks FIRST (must always be at top, before any conditional returns)
  const [callAlertEnabled, setCallAlertEnabled] = useState(event?.call_alert_enabled || false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditButton, setShowEditButton] = useState(isRecentlyCreated);
  const [showCallAlertTooltip, setShowCallAlertTooltip] = useState(false);
  
  // Timer to hide edit button after 15 seconds (only if recently created)
  useEffect(() => {
    if (!isRecentlyCreated) return;
    
    const remainingTime = event._createdAt ? Math.max(0, 15000 - (Date.now() - event._createdAt)) : 15000;
    
    const timer = setTimeout(() => {
      setShowEditButton(false);
    }, remainingTime);
    
    return () => clearTimeout(timer);
  }, [isRecentlyCreated, event._createdAt]);
  
  // Guard: Don't render if essential fields are missing
  if (!event || !event.title || !event.event_date) {
    console.warn('[EventCreatedCard] Missing required fields:', { 
      hasEvent: !!event,
      title: event?.title, 
      event_date: event?.event_date 
    });
    return null;
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return "Hoje";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Amanhã";
      }
      return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(":");
      return `${hours}:${minutes}`;
    } catch {
      return timeStr;
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const handleToggleCallAlert = async (e: React.MouseEvent, checked: boolean) => {
    e.stopPropagation(); // Prevent card click
    if (!event.id || isUpdating) return;
    
    setIsUpdating(true);
    setCallAlertEnabled(checked);
    
    // Show tooltip when activating
    if (checked) {
      setShowCallAlertTooltip(true);
      setTimeout(() => setShowCallAlertTooltip(false), 3000);
      
      // Schedule the call alert notification
      await scheduleCallAlert({
        id: event.id,
        title: event.title,
        event_date: event.event_date,
        event_time: event.event_time,
        location: event.location,
      });
    } else {
      // Cancel the scheduled notification
      await cancelCallAlert(event.id);
    }
    
    try {
      // Reset call_alert_sent_at when enabling so new notification can be sent
      const updateData: { call_alert_enabled: boolean; call_alert_sent_at?: null } = { 
        call_alert_enabled: checked 
      };
      if (checked) {
        updateData.call_alert_sent_at = null;
      }
      
      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', event.id);
      
      if (error) {
        console.error('Error updating call alert:', error);
        setCallAlertEnabled(!checked); // Revert on error
        setShowCallAlertTooltip(false);
        // Revert notification scheduling
        if (checked) {
          await cancelCallAlert(event.id);
        }
      }
    } catch (err) {
      console.error('Error updating call alert:', err);
      setCallAlertEnabled(!checked); // Revert on error
      setShowCallAlertTooltip(false);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get the time the call will be made (1h before)
  const callAlertTime = getCallAlertTime(event.event_time);

  // É dia inteiro se: is_all_day é true OU não tem hora OU não tem duração
  const isAllDay = event.is_all_day === true || !event.event_time || !event.duration_minutes;
  const eventEmoji = event.emoji || '📅';
  const eventColor = event.color || 'primary';

  // Get color class for the dot
  const colorClass = getColorClassName(eventColor);

  const handleCardClick = () => {
    if (event.id && onEdit) {
      onEdit(event.id);
    }
  };

  return (
    <div ref={ref} className="w-full max-w-[320px] animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header text with success icon */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <p className="text-sm text-muted-foreground">
          {type === 'updated' ? 'Evento Atualizado' : 'Evento Criado'}
        </p>
      </div>
      
      {/* Event Card - clickable */}
      <div 
        onClick={handleCardClick}
        className={`bg-kairo-surface-2 border border-border/30 rounded-2xl p-4 space-y-3 transition-all ${
          event.id && onEdit ? 'cursor-pointer hover:bg-kairo-surface-3 active:scale-[0.99]' : ''
        }`}
      >
        {/* Header: Color dot + Emoji + Title + Arrow */}
        <div className="flex items-center gap-3">
          {/* Color dot */}
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClass}`} />
          
          {/* Emoji */}
          <span className="text-xl flex-shrink-0">{eventEmoji}</span>
          
          {/* Title */}
          <span className="text-base font-semibold text-foreground flex-1 truncate">{event.title}</span>
          
          {/* Arrow indicator */}
          {event.id && onEdit && (
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        
        {/* Date and time / All day badge */}
        <div className="flex items-center justify-between text-sm pl-6">
          <span className="text-foreground capitalize">{formatDate(event.event_date)}</span>
          {isAllDay ? (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 rounded-full text-xs font-medium">
              🌞 Dia inteiro
            </span>
          ) : (
            <span className="text-muted-foreground font-medium">
              {formatTime(event.event_time)} - {calculateEndTime(event.event_time!, event.duration_minutes!)}
            </span>
          )}
        </div>
        
        {/* Me Ligue toggle */}
        <div className="relative pl-6">
          <div 
            className="flex items-center justify-between py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-500" />
              <span className="text-sm text-foreground">Me Ligue</span>
            </div>
            <Switch 
              checked={callAlertEnabled} 
              onCheckedChange={(checked) => handleToggleCallAlert({stopPropagation: () => {}} as React.MouseEvent, checked)}
              disabled={!event.id || isUpdating}
              className="data-[state=unchecked]:bg-gray-400 data-[state=checked]:bg-green-500" 
            />
          </div>
          
          {/* Tooltip when activated */}
          {showCallAlertTooltip && (
            <div className="absolute right-0 top-full mt-2 z-10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="bg-foreground text-background text-xs px-3 py-2 rounded-lg shadow-lg max-w-[220px]">
                {callAlertTime 
                  ? `Te ligaremos às ${callAlertTime}` 
                  : 'Te ligaremos 1h antes do seu compromisso'}
              </div>
            </div>
          )}
        </div>
        
        {/* Notification time */}
        <div className="flex items-center gap-2 pl-6">
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            {event.event_time ? `${formatTime(event.event_time)}, no dia` : "09:00, no dia"}
          </span>
        </div>
        
        {/* Description (if available) */}
        {event.description && (
          <p className="text-xs text-muted-foreground/80 pl-6">
            {event.description}
          </p>
        )}
        
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 pl-6">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-sm text-muted-foreground">{event.location}</span>
          </div>
        )}
      </div>
      
      {/* Edit button - visible for 15 seconds after creation only */}
      {showEditButton && event.id && onEdit && (
        <button
          onClick={() => onEdit(event.id!)}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-opacity animate-in fade-in-0 flex items-center gap-1"
        >
          Editar detalhes
        </button>
      )}
    </div>
  );
});

EventCreatedCard.displayName = 'EventCreatedCard';

export default EventCreatedCard;