import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, Bell, Phone, MapPin, CheckCircle, ChevronRight, Trash2, Clock, FileText
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
    call_alert_sent_at?: string;
    call_alert_attempts?: number;
    call_alert_answered?: boolean;
    call_alert_answered_at?: string;
    call_alert_outcome?: string;
    emoji?: string;
    color?: string;
    is_all_day?: boolean;
    repeat?: string;
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
  const [isDeleted, setIsDeleted] = useState(false);
  const [isCheckingDeleted, setIsCheckingDeleted] = useState(false);
  
  // Live call status data from database
  const [liveCallData, setLiveCallData] = useState({
    call_alert_sent_at: event.call_alert_sent_at,
    call_alert_attempts: event.call_alert_attempts,
    call_alert_answered: event.call_alert_answered,
    call_alert_answered_at: event.call_alert_answered_at,
    call_alert_outcome: event.call_alert_outcome,
  });
  
  // Check if event is expired (already happened) - only for non-recurring events
  const isExpired = useMemo(() => {
    // Recurring events never expire in this sense
    if (event.repeat && event.repeat !== 'never') return false;
    
    // Build the event datetime
    const eventDateTime = event.event_time 
      ? new Date(`${event.event_date}T${event.event_time}`)
      : new Date(`${event.event_date}T23:59:59`);
    
    return eventDateTime < new Date();
  }, [event.event_date, event.event_time, event.repeat]);
  
  // Fetch live call status data and subscribe to realtime updates
  useEffect(() => {
    if (!event.id) return;
    
    // Fetch latest call status data
    const fetchLiveData = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, call_alert_sent_at, call_alert_attempts, call_alert_answered, call_alert_answered_at, call_alert_outcome')
        .eq('id', event.id)
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Event doesn't exist
          setIsDeleted(true);
        }
        return;
      }
      
      if (!data) {
        setIsDeleted(true);
        return;
      }
      
      setLiveCallData({
        call_alert_sent_at: data.call_alert_sent_at,
        call_alert_attempts: data.call_alert_attempts,
        call_alert_answered: data.call_alert_answered,
        call_alert_answered_at: data.call_alert_answered_at,
        call_alert_outcome: data.call_alert_outcome,
      });
    };
    
    fetchLiveData();
    
    // Subscribe to realtime updates for this event
    const channel = supabase
      .channel(`event-call-status-${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${event.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          setLiveCallData({
            call_alert_sent_at: newData.call_alert_sent_at,
            call_alert_attempts: newData.call_alert_attempts,
            call_alert_answered: newData.call_alert_answered,
            call_alert_answered_at: newData.call_alert_answered_at,
            call_alert_outcome: newData.call_alert_outcome,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${event.id}`
        },
        () => {
          setIsDeleted(true);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);
  
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

  const formatDate = (dateStr: string, timeStr?: string | null) => {
    try {
      const date = parseISO(dateStr);
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      
      // Check if it's today
      if (dateOnly.getTime() === today.getTime()) {
        // If we have a time, check if the event has already passed
        if (timeStr) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const eventDateTime = new Date(date);
          eventDateTime.setHours(hours, minutes, 0, 0);
          
          if (eventDateTime < now) {
            return "Hoje (realizado)";
          }
        }
        return "Hoje";
      } else if (dateOnly.getTime() === tomorrow.getTime()) {
        return "Amanhã";
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        return "Ontem";
      }
      
      const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
      
      // Check if it's a past date
      if (dateOnly < today) {
        const diffTime = today.getTime() - dateOnly.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
          return `${formattedDate} (há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'})`;
        } else {
          return `${formattedDate} (passado)`;
        }
      }
      
      return formattedDate;
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

  // É dia inteiro APENAS se: is_all_day é true OU não tem hora
  // Ter hora sem duração = mostrar só o horário de início (não o intervalo)
  const isAllDay = event.is_all_day === true || !event.event_time;
  const hasDuration = event.duration_minutes && event.duration_minutes > 0;
  const eventEmoji = event.emoji || '📅';
  const eventColor = event.color || 'primary';

  // Get color class for the dot
  const colorClass = getColorClassName(eventColor);

  const handleCardClick = () => {
    if (event.id && onEdit) {
      onEdit(event.id);
    }
  };

  // Render deleted state
  if (isDeleted) {
    const formatDateDeleted = (dateStr: string) => {
      try {
        const date = parseISO(dateStr);
        return format(date, "d 'de' MMM", { locale: ptBR });
      } catch {
        return dateStr;
      }
    };

    return (
      <div ref={ref} className="w-full max-w-[320px]">
        {/* Header text with deleted indicator */}
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-red-500/60" />
          <p className="text-sm text-muted-foreground/60">Evento removido</p>
        </div>
        
        {/* Deleted Event Card */}
        <div className="bg-kairo-surface-2/50 border border-red-500/20 rounded-2xl p-4 space-y-2 opacity-70">
          {/* Header: Emoji + Title (strikethrough) */}
          <div className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0 opacity-50">{event.emoji || '📅'}</span>
            <span className="text-base font-semibold text-foreground/60 line-through flex-1 truncate">
              {event.title}
            </span>
          </div>
          
          {/* Date */}
          <div className="text-sm text-muted-foreground/50 pl-9 line-through">
            {formatDateDeleted(event.event_date)}
            {event.event_time && ` às ${event.event_time.slice(0, 5)}`}
          </div>
          
          {/* Location if exists */}
          {event.location && (
            <div className="flex items-center gap-2 pl-9 text-muted-foreground/50">
              <MapPin className="w-3 h-3" />
              <span className="text-sm line-through">{event.location}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`w-full max-w-[320px] animate-in fade-in-0 slide-in-from-bottom-4 duration-500 ${isExpired ? 'opacity-70' : ''}`}>
      {/* Header text with status icon */}
      <div className="flex items-center gap-2 mb-3">
        {isExpired ? (
          <>
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Evento Realizado</p>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              {type === 'updated' ? 'Evento Atualizado' : 'Evento Criado'}
            </p>
          </>
        )}
      </div>
      
      {/* Event Card - clickable */}
      <div 
        onClick={handleCardClick}
        className={`border rounded-2xl p-4 space-y-3 transition-all ${
          isExpired 
            ? 'bg-kairo-surface-2/60 border-border/20' 
            : 'bg-kairo-surface-2 border-border/30'
        } ${
          event.id && onEdit ? 'cursor-pointer hover:bg-kairo-surface-3 active:scale-[0.99]' : ''
        }`}
      >
        {/* Header: Color dot + Emoji + Title + Arrow */}
        <div className="flex items-center gap-3">
          {/* Color dot */}
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isExpired ? 'opacity-50' : ''} ${colorClass}`} />
          
          {/* Emoji */}
          <span className={`text-xl flex-shrink-0 ${isExpired ? 'opacity-60' : ''}`}>{eventEmoji}</span>
          
          {/* Title */}
          <span className={`text-base font-semibold flex-1 truncate ${isExpired ? 'text-foreground/60' : 'text-foreground'}`}>{event.title}</span>
          
          {/* Arrow indicator */}
          {event.id && onEdit && (
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        
        {/* Date and time / All day badge */}
        <div className={`flex items-center justify-between text-sm pl-6 ${isExpired ? 'text-muted-foreground/60' : ''}`}>
          <span className={`capitalize ${isExpired ? 'text-foreground/60' : 'text-foreground'}`}>{formatDate(event.event_date, event.event_time)}</span>
        {isAllDay ? (
            <span className="text-muted-foreground text-sm whitespace-nowrap">☀️ Dia inteiro</span>
          ) : hasDuration ? (
            <span className="text-muted-foreground font-medium">
              {formatTime(event.event_time)} - {calculateEndTime(event.event_time!, event.duration_minutes!)}
            </span>
          ) : (
            <span className="text-muted-foreground font-medium">
              {formatTime(event.event_time)}
            </span>
          )}
        </div>
        
        {/* Me Ligue toggle - disabled for expired events */}
        <div className="relative pl-6">
          <div 
            className="flex items-center justify-between py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Phone className={`w-4 h-4 ${isExpired ? 'text-muted-foreground/50' : 'text-green-500'}`} />
              <span className={`text-sm ${isExpired ? 'text-muted-foreground/60' : 'text-foreground'}`}>Me Ligue</span>
            </div>
            <Switch 
              checked={isExpired ? false : callAlertEnabled} 
              onCheckedChange={(checked) => handleToggleCallAlert({stopPropagation: () => {}} as React.MouseEvent, checked)}
              disabled={!event.id || isUpdating || isExpired}
              className="data-[state=unchecked]:bg-gray-400 data-[state=checked]:bg-green-500" 
            />
          </div>
          
          {/* Call status indicator - show when call was sent (using live data) */}
          {liveCallData.call_alert_sent_at && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {liveCallData.call_alert_answered ? (
                <>
                  <span className="inline-flex items-center gap-1 text-emerald-500">
                    <Phone className="w-3 h-3" />
                    ✅ Atendida
                  </span>
                  {liveCallData.call_alert_answered_at && (
                    <span className="text-muted-foreground">
                      às {format(parseISO(liveCallData.call_alert_answered_at), 'HH:mm')}
                    </span>
                  )}
                </>
              ) : liveCallData.call_alert_outcome === 'missed' ? (
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <Phone className="w-3 h-3" />
                  📞 Ligamos {liveCallData.call_alert_attempts && liveCallData.call_alert_attempts > 1 ? `${liveCallData.call_alert_attempts}x` : ''} - não atendida
                </span>
              ) : liveCallData.call_alert_outcome === 'sent' ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  📞 Ligação enviada às {format(parseISO(liveCallData.call_alert_sent_at), 'HH:mm')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground/60">
                  <Phone className="w-3 h-3" />
                  📞 Ligamos (sem dados de resultado)
                </span>
              )}
            </div>
          )}
          
          {/* Tooltip when activated */}
          {showCallAlertTooltip && !isExpired && (
            <div className="absolute right-0 top-full mt-2 z-10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="bg-foreground text-background text-xs px-3 py-2 rounded-lg shadow-lg max-w-[220px]">
                {callAlertTime 
                  ? `Te ligaremos às ${callAlertTime}` 
                  : 'Te ligaremos 1h antes do seu compromisso'}
              </div>
            </div>
          )}
          
          {/* Tooltip for expired events */}
          {isExpired && (
            <p className="text-xs text-muted-foreground/50 mt-1">
              Não disponível para eventos passados
            </p>
          )}
        </div>
        
        {/* Notification time - hide for expired */}
        {!isExpired && (
          <div className="flex items-center gap-2 pl-6">
            <Bell className="w-4 h-4 text-sky-500" />
            <span className="text-sm text-muted-foreground">
              {event.event_time ? `${formatTime(event.event_time)}, no dia` : "09:00, no dia"}
            </span>
          </div>
        )}
        
        {/* Notes/Description - with italic styling */}
        {event.description && (
          <div className="flex items-start gap-2 pl-6 mt-2">
            <FileText className="w-3 h-3 text-muted-foreground/60 mt-0.5 flex-shrink-0" />
            <p className={`text-xs leading-relaxed italic ${isExpired ? 'text-muted-foreground/50' : 'text-muted-foreground/70'}`}>
              {event.description}
            </p>
          </div>
        )}
        
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 pl-6">
            <MapPin className={`w-4 h-4 ${isExpired ? 'text-muted-foreground/50' : 'text-red-500'}`} />
            <span className={`text-sm ${isExpired ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{event.location}</span>
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