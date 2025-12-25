import React, { useState, useEffect } from "react";
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
    call_alert_scheduled_at?: string; // Added for showing actual scheduled call time
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
  
  // Live event data from database - all fields, not just call_alert
  const [liveEventData, setLiveEventData] = useState<{
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
    call_alert_scheduled_at?: string; // Added for showing actual scheduled call time
    call_alert_attempts?: number;
    call_alert_answered?: boolean;
    call_alert_answered_at?: string;
    call_alert_outcome?: string;
    emoji?: string;
    color?: string;
    is_all_day?: boolean;
    repeat?: string;
  } | null>(null);

  // Sync callAlertEnabled when event prop changes OR live data changes
  useEffect(() => {
    const enabled = liveEventData?.call_alert_enabled ?? event?.call_alert_enabled ?? false;
    setCallAlertEnabled(enabled);
  }, [event?.call_alert_enabled, liveEventData?.call_alert_enabled]);
  
  // Check if event is expired (already happened) - only for non-recurring events
  // Uses state + interval to update in real-time when event expires
  const [isExpired, setIsExpired] = useState(false);
  
  useEffect(() => {
    // Use live data if available, fallback to event prop
    const currentEvent = liveEventData || event;
    
    const checkExpired = () => {
      // Recurring events never expire in this sense
      if (currentEvent.repeat && currentEvent.repeat !== 'never') {
        setIsExpired(false);
        return;
      }
      
      // Build the event datetime - parse explicitly to avoid timezone issues
      const [year, month, day] = currentEvent.event_date.split('-').map(Number);
      const eventDateTime = currentEvent.event_time 
        ? (() => {
            const [hours, minutes] = currentEvent.event_time.split(':').map(Number);
            return new Date(year, month - 1, day, hours, minutes, 0, 0);
          })()
        : new Date(year, month - 1, day, 23, 59, 59, 0);
      
      setIsExpired(eventDateTime < new Date());
    };
    
    // Check immediately
    checkExpired();
    
    // Re-check every minute to update when event expires
    const interval = setInterval(checkExpired, 60000);
    
    return () => clearInterval(interval);
  }, [event.event_date, event.event_time, event.repeat, liveEventData]);
  
  // Fetch live event data and subscribe to realtime updates
  useEffect(() => {
    if (!event.id) return;
    
    // Fetch latest event data (all fields)
    const fetchLiveData = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, event_date, event_time, duration_minutes, location, category, notification_enabled, call_alert_enabled, call_alert_sent_at, call_alert_scheduled_at, call_alert_attempts, call_alert_answered, call_alert_answered_at, call_alert_outcome, emoji, color, is_all_day, repeat')
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
      
      setLiveEventData({
        id: data.id,
        title: data.title,
        description: data.description ?? undefined,
        event_date: data.event_date,
        event_time: data.event_time ?? undefined,
        duration_minutes: data.duration_minutes ?? undefined,
        location: data.location ?? undefined,
        category: data.category ?? undefined,
        notification_enabled: data.notification_enabled ?? undefined,
        call_alert_enabled: data.call_alert_enabled ?? undefined,
        call_alert_sent_at: data.call_alert_sent_at ?? undefined,
        call_alert_scheduled_at: data.call_alert_scheduled_at ?? undefined,
        call_alert_attempts: data.call_alert_attempts ?? undefined,
        call_alert_answered: data.call_alert_answered ?? undefined,
        call_alert_answered_at: data.call_alert_answered_at ?? undefined,
        call_alert_outcome: data.call_alert_outcome ?? undefined,
        emoji: data.emoji ?? undefined,
        color: data.color ?? undefined,
        is_all_day: data.is_all_day ?? undefined,
        repeat: data.repeat ?? undefined,
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
          setLiveEventData({
            id: newData.id,
            title: newData.title,
            description: newData.description ?? undefined,
            event_date: newData.event_date,
            event_time: newData.event_time ?? undefined,
            duration_minutes: newData.duration_minutes ?? undefined,
            location: newData.location ?? undefined,
            category: newData.category ?? undefined,
            notification_enabled: newData.notification_enabled ?? undefined,
            call_alert_enabled: newData.call_alert_enabled ?? undefined,
            call_alert_sent_at: newData.call_alert_sent_at ?? undefined,
            call_alert_scheduled_at: newData.call_alert_scheduled_at ?? undefined,
            call_alert_attempts: newData.call_alert_attempts ?? undefined,
            call_alert_answered: newData.call_alert_answered ?? undefined,
            call_alert_answered_at: newData.call_alert_answered_at ?? undefined,
            call_alert_outcome: newData.call_alert_outcome ?? undefined,
            emoji: newData.emoji ?? undefined,
            color: newData.color ?? undefined,
            is_all_day: newData.is_all_day ?? undefined,
            repeat: newData.repeat ?? undefined,
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
      
      // Schedule the call alert notification (local fallback)
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
      // Get current user for VoIP
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calculate when the call should happen
      let callScheduledAt: Date | null = null;
      let shouldCallImmediately = false;
      
      if (checked && event.event_time) {
        const [year, month, day] = event.event_date.split('-').map(Number);
        const [hours, minutes] = event.event_time.split(':').map(Number);
        const eventDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        
        const now = new Date();
        const diffMinutes = Math.floor((eventDateTime.getTime() - now.getTime()) / (1000 * 60));
        
        // Calculate alert minutes using same logic as getBestCallAlertMinutes
        let alertMinutes = 60; // default
        if (diffMinutes <= 2) alertMinutes = 0; // Too close
        else if (diffMinutes <= 5) alertMinutes = 2;
        else if (diffMinutes <= 15) alertMinutes = 5;
        else if (diffMinutes <= 30) alertMinutes = 15;
        else if (diffMinutes <= 60) alertMinutes = 30;
        else if (diffMinutes <= 120) alertMinutes = 60;
        
        // Calculate scheduled time
        callScheduledAt = new Date(eventDateTime.getTime() - alertMinutes * 60 * 1000);
        
        // If scheduled time is within 3 minutes from now or already passed, call immediately
        const minutesUntilCall = Math.floor((callScheduledAt.getTime() - now.getTime()) / (1000 * 60));
        if (minutesUntilCall <= 3 && diffMinutes > 2) {
          shouldCallImmediately = true;
          console.log('[EventCreatedCard] Event is close, will trigger VoIP immediately');
        }
      }
      
      // Reset call_alert_sent_at and set scheduled time when enabling
      const updateData: { 
        call_alert_enabled: boolean; 
        call_alert_sent_at?: null;
        call_alert_scheduled_at?: string | null;
      } = { 
        call_alert_enabled: checked 
      };
      
      if (checked) {
        updateData.call_alert_sent_at = null;
        updateData.call_alert_scheduled_at = callScheduledAt?.toISOString() || null;
      } else {
        updateData.call_alert_scheduled_at = null;
      }
      
      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', event.id);
      
      if (error) {
        console.error('Error updating call alert:', error);
        setCallAlertEnabled(!checked); // Revert on error
        setShowCallAlertTooltip(false);
        if (checked) {
          await cancelCallAlert(event.id);
        }
        return;
      }
      
      // If event is close and user is authenticated, trigger VoIP immediately
      if (checked && shouldCallImmediately && user?.id) {
        console.log('[EventCreatedCard] Triggering immediate VoIP call');
        try {
          const { error: voipError } = await supabase.functions.invoke('send-voip-push', {
            body: {
              user_id: user.id,
              event_id: event.id,
              event_title: event.title,
              event_time: event.event_time,
              event_location: event.location,
              event_emoji: event.emoji || '📅',
            },
          });
          
          if (voipError) {
            console.error('[EventCreatedCard] VoIP error:', voipError);
          } else {
            console.log('[EventCreatedCard] VoIP call triggered successfully');
          }
        } catch (voipErr) {
          console.error('[EventCreatedCard] Error triggering VoIP:', voipErr);
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

  // Use live data if available, fallback to original event prop
  const displayEvent = liveEventData || event;

  // Get call alert info - prefer actual scheduled time from database over dynamic calculation
  const getActualCallAlertInfo = () => {
    // If we have a scheduled time from the database, use that
    if (displayEvent.call_alert_scheduled_at) {
      const scheduledDate = parseISO(displayEvent.call_alert_scheduled_at);
      const callTime = format(scheduledDate, 'HH:mm');
      
      // Calculate minutes before for the label
      if (displayEvent.event_time) {
        const [year, month, day] = displayEvent.event_date.split('-').map(Number);
        const [hours, minutes] = displayEvent.event_time.split(':').map(Number);
        const eventDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        const diffMs = eventDateTime.getTime() - scheduledDate.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        const label = diffMinutes < 60 
          ? `${diffMinutes} min antes` 
          : `${Math.floor(diffMinutes / 60)} hora${Math.floor(diffMinutes / 60) > 1 ? 's' : ''} antes`;
        
        return { time: callTime, label, minutesBefore: diffMinutes };
      }
      
      return { time: callTime, label: 'agendado', minutesBefore: 0 };
    }
    
    // Fallback to dynamic calculation
    return getCallAlertTime(displayEvent.event_date, displayEvent.event_time);
  };
  
  const callAlertInfo = getActualCallAlertInfo();
  const canEnableCallAlert = callAlertInfo !== null;

  // É dia inteiro APENAS se: is_all_day é true OU não tem hora
  // Ter hora sem duração = mostrar só o horário de início (não o intervalo)
  const isAllDay = displayEvent.is_all_day === true || !displayEvent.event_time;
  const hasDuration = displayEvent.duration_minutes && displayEvent.duration_minutes > 0;
  const eventEmoji = displayEvent.emoji || '📅';
  const eventColor = displayEvent.color || 'primary';

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
          <span className={`text-base font-semibold flex-1 truncate ${isExpired ? 'text-foreground/60' : 'text-foreground'}`}>{displayEvent.title}</span>
          
          {/* Arrow indicator */}
          {event.id && onEdit && (
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        
        {/* Date and time / All day badge */}
        <div className={`flex items-center justify-between text-sm pl-6 ${isExpired ? 'text-muted-foreground/60' : ''}`}>
          <span className={`capitalize ${isExpired ? 'text-foreground/60' : 'text-foreground'}`}>{formatDate(displayEvent.event_date, displayEvent.event_time)}</span>
        {isAllDay ? (
            <span className="text-muted-foreground text-sm whitespace-nowrap">☀️ Dia inteiro</span>
          ) : hasDuration ? (
            <span className="text-muted-foreground font-medium">
              {formatTime(displayEvent.event_time)} - {calculateEndTime(displayEvent.event_time!, displayEvent.duration_minutes!)}
            </span>
          ) : (
            <span className="text-muted-foreground font-medium">
              {formatTime(displayEvent.event_time)}
            </span>
          )}
        </div>
        
        {/* Me Ligue toggle - disabled for expired events or events too close */}
        <div className="relative pl-6">
          <div 
            className="flex items-center justify-between py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Phone className={`w-4 h-4 ${isExpired || !canEnableCallAlert ? 'text-muted-foreground/50' : 'text-green-500'}`} />
              <span className={`text-sm ${isExpired || !canEnableCallAlert ? 'text-muted-foreground/60' : 'text-foreground'}`}>Me Ligue</span>
              {/* Show dynamic timing info */}
              {callAlertInfo && !isExpired && (
                <span className="text-xs text-muted-foreground">
                  ({callAlertInfo.label})
                </span>
              )}
              {!canEnableCallAlert && !isExpired && (
                <span className="text-xs text-amber-500">
                  (muito próximo)
                </span>
              )}
            </div>
            <Switch 
              checked={isExpired || !canEnableCallAlert ? false : callAlertEnabled} 
              onCheckedChange={(checked) => handleToggleCallAlert({stopPropagation: () => {}} as React.MouseEvent, checked)}
              disabled={!event.id || isUpdating || isExpired || !canEnableCallAlert || callAlertEnabled}
              className="data-[state=unchecked]:bg-gray-400 data-[state=checked]:bg-green-500" 
            />
          </div>
          
          {/* Call status indicator - show when call was sent (using live data) */}
          {displayEvent.call_alert_sent_at && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {displayEvent.call_alert_answered ? (
                <>
                  <span className="inline-flex items-center gap-1 text-emerald-500">
                    <Phone className="w-3 h-3" />
                    ✅ Atendida
                  </span>
                  {displayEvent.call_alert_answered_at && (
                    <span className="text-muted-foreground">
                      às {format(parseISO(displayEvent.call_alert_answered_at), 'HH:mm')}
                    </span>
                  )}
                </>
              ) : displayEvent.call_alert_outcome === 'missed' ? (
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <Phone className="w-3 h-3" />
                  📞 Ligamos {displayEvent.call_alert_attempts && displayEvent.call_alert_attempts > 1 ? `${displayEvent.call_alert_attempts}x` : ''} - não atendida
                </span>
              ) : displayEvent.call_alert_outcome === 'sent' ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  📞 Ligação enviada às {format(parseISO(displayEvent.call_alert_sent_at), 'HH:mm')}
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
          {showCallAlertTooltip && !isExpired && callAlertInfo && (
            <div className="absolute right-0 top-full mt-2 z-10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="bg-foreground text-background text-xs px-3 py-2 rounded-lg shadow-lg max-w-[220px]">
                Te ligaremos às {callAlertInfo.time} ({callAlertInfo.label})
              </div>
            </div>
          )}
          
          {/* Tooltip for expired events */}
          {isExpired && (
            <p className="text-xs text-muted-foreground/50 mt-1">
              Não disponível para eventos passados
            </p>
          )}
          
          {/* Tooltip for events too close */}
          {!isExpired && !canEnableCallAlert && (
            <p className="text-xs text-amber-500/80 mt-1">
              Evento muito próximo para ativar
            </p>
          )}
        </div>
        
        {/* Notification time - hide for expired */}
        {!isExpired && (
          <div className="flex items-center gap-2 pl-6">
            <Bell className="w-4 h-4 text-sky-500" />
            <span className="text-sm text-muted-foreground">
              {displayEvent.event_time ? `${formatTime(displayEvent.event_time)}, no dia` : "09:00, no dia"}
            </span>
          </div>
        )}
        
        {/* Notes/Description - with italic styling */}
        {displayEvent.description && (
          <div className="flex items-start gap-2 pl-6 mt-2">
            <FileText className="w-3 h-3 text-muted-foreground/60 mt-0.5 flex-shrink-0" />
            <p className={`text-xs leading-relaxed italic ${isExpired ? 'text-muted-foreground/50' : 'text-muted-foreground/70'}`}>
              {displayEvent.description}
            </p>
          </div>
        )}
        
        {/* Location */}
        {displayEvent.location && (
          <div className="flex items-center gap-2 pl-6">
            <MapPin className={`w-4 h-4 ${isExpired ? 'text-muted-foreground/50' : 'text-red-500'}`} />
            <span className={`text-sm ${isExpired ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{displayEvent.location}</span>
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