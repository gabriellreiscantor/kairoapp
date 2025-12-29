import React, { useState, useEffect } from "react";
import { 
  Calendar, Bell, Phone, MapPin, CheckCircle, ChevronRight, Trash2, Clock, FileText, AlertCircle, RefreshCw
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { scheduleCallAlert, cancelCallAlert, getCallAlertTime } from "@/hooks/useCallAlertScheduler";
import { getColorClassName } from "@/lib/event-constants";
import { useLanguage } from "@/contexts/LanguageContext";

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
    call_alert_scheduled_at?: string;
    call_alert_attempts?: number;
    call_alert_answered?: boolean;
    call_alert_answered_at?: string;
    call_alert_outcome?: string;
    emoji?: string;
    color?: string;
    is_all_day?: boolean;
    repeat?: string;
    alerts?: Array<{ time?: string }>;
    _createdAt?: number;
    saveFailed?: boolean;
    saveFailedReason?: string;
  };
  type?: 'created' | 'updated';
  onEdit?: (eventId: string) => void;
  onRetry?: (event: EventCreatedCardProps['event']) => void;
}

const EventCreatedCard = React.forwardRef<HTMLDivElement, EventCreatedCardProps>(
  ({ event, type = 'created', onEdit, onRetry }, ref) => {
  
  const { t, getDateLocale } = useLanguage();
  const dateLocale = getDateLocale();
  
  // Calculate if event was just created (within 15 seconds)
  const isRecentlyCreated = event._createdAt ? (Date.now() - event._createdAt < 15000) : false;
  
  // Hooks FIRST (must always be at top, before any conditional returns)
  const [callAlertEnabled, setCallAlertEnabled] = useState(event?.call_alert_enabled || false);
  const [notificationEnabled, setNotificationEnabled] = useState(event?.notification_enabled ?? true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);
  const [showEditButton, setShowEditButton] = useState(isRecentlyCreated);
  const [showCallAlertTooltip, setShowCallAlertTooltip] = useState(false);
  const [showNotificationTooltip, setShowNotificationTooltip] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isCheckingDeleted, setIsCheckingDeleted] = useState(false);
  
  // Live event data from database
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
    call_alert_scheduled_at?: string;
    call_alert_attempts?: number;
    call_alert_answered?: boolean;
    call_alert_answered_at?: string;
    call_alert_outcome?: string;
    emoji?: string;
    color?: string;
    is_all_day?: boolean;
    repeat?: string;
    alerts?: Array<{ time?: string }>;
  } | null>(null);

  // Sync callAlertEnabled when event prop changes OR live data changes
  useEffect(() => {
    const enabled = liveEventData?.call_alert_enabled ?? event?.call_alert_enabled ?? false;
    setCallAlertEnabled(enabled);
  }, [event?.call_alert_enabled, liveEventData?.call_alert_enabled]);
  
  // Sync notificationEnabled when event prop changes OR live data changes
  useEffect(() => {
    const enabled = liveEventData?.notification_enabled ?? event?.notification_enabled ?? true;
    setNotificationEnabled(enabled);
  }, [event?.notification_enabled, liveEventData?.notification_enabled]);
  
  // Check if event is expired
  const [isExpired, setIsExpired] = useState(false);
  
  useEffect(() => {
    const currentEvent = liveEventData || event;
    
    const checkExpired = () => {
      if (currentEvent.repeat && currentEvent.repeat !== 'never') {
        setIsExpired(false);
        return;
      }
      
      const [year, month, day] = currentEvent.event_date.split('-').map(Number);
      const eventDateTime = currentEvent.event_time 
        ? (() => {
            const [hours, minutes] = currentEvent.event_time.split(':').map(Number);
            return new Date(year, month - 1, day, hours, minutes, 0, 0);
          })()
        : new Date(year, month - 1, day, 23, 59, 59, 0);
      
      setIsExpired(eventDateTime < new Date());
    };
    
    checkExpired();
    const interval = setInterval(checkExpired, 60000);
    return () => clearInterval(interval);
  }, [event.event_date, event.event_time, event.repeat, liveEventData]);
  
  // Fetch live event data and subscribe to realtime updates
  useEffect(() => {
    if (!event.id) return;
    
    const fetchLiveData = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, event_date, event_time, duration_minutes, location, category, notification_enabled, notification_scheduled_at, notification_sent_at, call_alert_enabled, call_alert_sent_at, call_alert_scheduled_at, call_alert_attempts, call_alert_answered, call_alert_answered_at, call_alert_outcome, emoji, color, is_all_day, repeat, alerts')
        .eq('id', event.id)
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') {
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
        alerts: (data.alerts as Array<{ time?: string }>) ?? undefined,
      });
    };
    
    fetchLiveData();
    
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
            alerts: (newData.alerts as Array<{ time?: string }>) ?? undefined,
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
  
  // Timer to hide edit button after 15 seconds
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
      
      if (dateOnly.getTime() === today.getTime()) {
        if (timeStr) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const eventDateTime = new Date(date);
          eventDateTime.setHours(hours, minutes, 0, 0);
          
          if (eventDateTime < now) {
            return t('event.todayCompleted');
          }
        }
        return t('common.today');
      } else if (dateOnly.getTime() === tomorrow.getTime()) {
        return t('common.tomorrow');
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        return t('common.yesterday');
      }
      
      const formattedDate = format(date, t('event.dateFormat'), { locale: dateLocale });
      
      if (dateOnly < today) {
        const diffTime = today.getTime() - dateOnly.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
          const unit = diffDays === 1 ? t('event.day') : t('event.days');
          return `${formattedDate} (${t('event.daysAgo').replace('{count}', String(diffDays)).replace('{unit}', unit)})`;
        } else {
          return `${formattedDate} (${t('event.past')})`;
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
    e.stopPropagation();
    if (!event.id || isUpdating) return;
    
    setIsUpdating(true);
    setCallAlertEnabled(checked);
    
    if (checked) {
      setShowCallAlertTooltip(true);
      setTimeout(() => setShowCallAlertTooltip(false), 3000);
      
      await scheduleCallAlert({
        id: event.id,
        title: event.title,
        event_date: event.event_date,
        event_time: event.event_time,
        location: event.location,
      });
    } else {
      await cancelCallAlert(event.id);
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let callScheduledAt: Date | null = null;
      let shouldCallImmediately = false;
      
      if (checked && event.event_time) {
        const [year, month, day] = event.event_date.split('-').map(Number);
        const [hours, minutes] = event.event_time.split(':').map(Number);
        const eventDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        
        const now = new Date();
        const diffMinutes = Math.floor((eventDateTime.getTime() - now.getTime()) / (1000 * 60));
        
        let alertMinutes = 60;
        if (diffMinutes <= 2) alertMinutes = 0;
        else if (diffMinutes <= 5) alertMinutes = 2;
        else if (diffMinutes <= 15) alertMinutes = 5;
        else if (diffMinutes <= 30) alertMinutes = 15;
        else if (diffMinutes <= 60) alertMinutes = 30;
        else if (diffMinutes <= 120) alertMinutes = 60;
        
        callScheduledAt = new Date(eventDateTime.getTime() - alertMinutes * 60 * 1000);
        
        const minutesUntilCall = Math.floor((callScheduledAt.getTime() - now.getTime()) / (1000 * 60));
        if (minutesUntilCall <= 3 && diffMinutes > 2) {
          shouldCallImmediately = true;
        }
      }
      
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
        setCallAlertEnabled(!checked);
        setShowCallAlertTooltip(false);
        if (checked) {
          await cancelCallAlert(event.id);
        }
        return;
      }
      
      if (checked && shouldCallImmediately && user?.id) {
        try {
          const storedDeviceId = localStorage.getItem('device_id');
          
          if (storedDeviceId) {
            await supabase.functions.invoke('send-voip-push', {
              body: {
                device_id: storedDeviceId,
                user_id: user.id,
                event_id: event.id,
                event_title: event.title,
                event_time: event.event_time,
                event_location: event.location,
                event_emoji: event.emoji || '📅',
              },
            });
          }
        } catch (voipErr) {
          console.error('[EventCreatedCard] Error triggering VoIP:', voipErr);
        }
      }
    } catch (err) {
      console.error('Error updating call alert:', err);
      setCallAlertEnabled(!checked);
      setShowCallAlertTooltip(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleNotification = async (e: React.MouseEvent, checked: boolean) => {
    e.stopPropagation();
    if (!event.id || isUpdatingNotification) return;
    
    setIsUpdatingNotification(true);
    setNotificationEnabled(checked);
    
    if (checked) {
      setShowNotificationTooltip(true);
      setTimeout(() => setShowNotificationTooltip(false), 3000);
    }
    
    try {
      let notificationScheduledAt: Date | null = null;
      
      if (checked && event.event_time) {
        const [year, month, day] = event.event_date.split('-').map(Number);
        const [hours, minutes] = event.event_time.split(':').map(Number);
        const eventDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        
        const now = new Date();
        const diffMinutes = Math.floor((eventDateTime.getTime() - now.getTime()) / (1000 * 60));
        
        let alertMinutes = 60;
        if (diffMinutes <= 2) alertMinutes = 0;
        else if (diffMinutes <= 5) alertMinutes = 2;
        else if (diffMinutes <= 15) alertMinutes = 5;
        else if (diffMinutes <= 30) alertMinutes = 15;
        else if (diffMinutes <= 60) alertMinutes = 30;
        else if (diffMinutes <= 120) alertMinutes = 60;
        
        notificationScheduledAt = new Date(eventDateTime.getTime() - alertMinutes * 60 * 1000);
        
        if (notificationScheduledAt <= now) {
          if (diffMinutes > 2) {
            notificationScheduledAt = new Date(now.getTime() + 60 * 1000);
          } else {
            setNotificationEnabled(false);
            setIsUpdatingNotification(false);
            return;
          }
        }
      }
      
      const updateData: {
        notification_enabled: boolean;
        notification_scheduled_at?: string | null;
        notification_sent_at?: null;
      } = {
        notification_enabled: checked
      };
      
      if (checked) {
        updateData.notification_scheduled_at = notificationScheduledAt?.toISOString() || null;
        updateData.notification_sent_at = null;
      } else {
        updateData.notification_scheduled_at = null;
      }
      
      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', event.id);
      
      if (error) {
        console.error('Error updating notification:', error);
        setNotificationEnabled(!checked);
        setShowNotificationTooltip(false);
        return;
      }
    } catch (err) {
      console.error('Error updating notification:', err);
      setNotificationEnabled(!checked);
      setShowNotificationTooltip(false);
    } finally {
      setIsUpdatingNotification(false);
    }
  };

  const displayEvent = liveEventData || event;

  const getAlertLabel = (alertValue: string): string => {
    const labelMap: Record<string, string> = {
      'exact': t('event.exactMoment'),
      '5min': t('event.5minBefore'),
      '15min': t('event.15minBefore'),
      '30min': t('event.30minBefore'),
      '1hour': t('event.oneHourBefore'),
      '2hours': t('event.2hoursBefore'),
      '1day': t('event.1dayBefore'),
    };
    return labelMap[alertValue] || alertValue;
  };

  const getActualCallAlertInfo = () => {
    let label = t('event.oneHourBefore');
    let minutesBefore = 60;
    
    if (displayEvent.alerts && Array.isArray(displayEvent.alerts) && displayEvent.alerts.length > 0) {
      const alertValue = (displayEvent.alerts[0] as { time?: string })?.time;
      if (alertValue) {
        label = getAlertLabel(alertValue);
        const minutesMap: Record<string, number> = {
          'exact': 0, '5min': 5, '15min': 15, '30min': 30,
          '1hour': 60, '2hours': 120, '1day': 1440,
        };
        minutesBefore = minutesMap[alertValue] ?? 60;
      }
    }
    
    if (displayEvent.call_alert_scheduled_at) {
      const scheduledDate = parseISO(displayEvent.call_alert_scheduled_at);
      const callTime = format(scheduledDate, 'HH:mm');
      return { time: callTime, label, minutesBefore };
    }
    
    const fallback = getCallAlertTime(displayEvent.event_date, displayEvent.event_time);
    if (fallback) {
      return { ...fallback, label, minutesBefore };
    }
    
    return null;
  };
  
  const callAlertInfo = getActualCallAlertInfo();
  const canEnableCallAlert = callAlertInfo !== null;

  const isAllDay = displayEvent.is_all_day === true || !displayEvent.event_time;
  const hasDuration = displayEvent.duration_minutes && displayEvent.duration_minutes > 0;
  const eventEmoji = displayEvent.emoji || '📅';
  const eventColor = displayEvent.color || 'primary';

  const colorClass = getColorClassName(eventColor);

  const handleCardClick = () => {
    if (event.id && onEdit) {
      onEdit(event.id);
    }
  };

  // Render save failed state
  if (event.saveFailed) {
    const formatDateFailed = (dateStr: string) => {
      try {
        const date = parseISO(dateStr);
        return format(date, t('event.dateFormatShort'), { locale: dateLocale });
      } catch {
        return dateStr;
      }
    };

    const handleRetryClick = () => {
      if (onRetry) {
        onRetry(event);
      }
    };

    return (
      <div ref={ref} className="w-full max-w-[320px]">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <p className="text-sm text-destructive">{t('event.saveError')}</p>
        </div>
        
        <div className="bg-kairo-surface-2/50 border border-destructive/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0 opacity-60">{event.emoji || '📅'}</span>
            <span className="text-base font-semibold text-foreground/70 flex-1 truncate">
              {event.title}
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground/60 pl-9">
            {formatDateFailed(event.event_date)}
            {event.event_time && ` ${t('event.at')} ${event.event_time.slice(0, 5)}`}
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2 pl-9 text-muted-foreground/60">
              <MapPin className="w-3 h-3" />
              <span className="text-sm">{event.location}</span>
            </div>
          )}
          
          <div className="text-xs text-destructive/70 pl-9 mt-2">
            {t('event.notSaved')}
          </div>
          
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryClick}
              className="w-full mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('event.tryAgain')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Render deleted state
  if (isDeleted) {
    const formatDateDeleted = (dateStr: string) => {
      try {
        const date = parseISO(dateStr);
        return format(date, t('event.dateFormatShort'), { locale: dateLocale });
      } catch {
        return dateStr;
      }
    };

    return (
      <div ref={ref} className="w-full max-w-[320px]">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-red-500/60" />
          <p className="text-sm text-muted-foreground/60">{t('event.removed')}</p>
        </div>
        
        <div className="bg-kairo-surface-2/50 border border-red-500/20 rounded-2xl p-4 space-y-2 opacity-70">
          <div className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0 opacity-50">{event.emoji || '📅'}</span>
            <span className="text-base font-semibold text-foreground/60 line-through flex-1 truncate">
              {event.title}
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground/50 pl-9 line-through">
            {formatDateDeleted(event.event_date)}
            {event.event_time && ` ${t('event.at')} ${event.event_time.slice(0, 5)}`}
          </div>
          
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
            <p className="text-sm text-muted-foreground">{t('event.completed')}</p>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              {type === 'updated' ? t('event.updated') : t('event.created')}
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
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isExpired ? 'opacity-50' : ''} ${colorClass}`} />
          <span className={`text-xl flex-shrink-0 ${isExpired ? 'opacity-60' : ''}`}>{eventEmoji}</span>
          <span className={`text-base font-semibold flex-1 truncate ${isExpired ? 'text-foreground/60' : 'text-foreground'}`}>{displayEvent.title}</span>
          {event.id && onEdit && (
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        
        {/* Date and time / All day badge */}
        <div className={`flex items-center justify-between text-sm pl-6 ${isExpired ? 'text-muted-foreground/60' : ''}`}>
          <span className={`capitalize ${isExpired ? 'text-foreground/60' : 'text-foreground'}`}>{formatDate(displayEvent.event_date, displayEvent.event_time)}</span>
        {isAllDay ? (
            <span className="text-muted-foreground text-sm whitespace-nowrap">☀️ {t('event.allDay')}</span>
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
        
        {/* Me Ligue toggle */}
        <div className="relative pl-6">
          <div 
            className="flex items-center justify-between py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Phone className={`w-4 h-4 ${isExpired || !canEnableCallAlert ? 'text-muted-foreground/50' : 'text-green-500'}`} />
              <span className={`text-sm ${isExpired || !canEnableCallAlert ? 'text-muted-foreground/60' : 'text-foreground'}`}>{t('event.callMe')}</span>
              {callAlertInfo && !isExpired && (
                <span className="text-xs text-muted-foreground">
                  ({callAlertInfo.label})
                </span>
              )}
              {!canEnableCallAlert && !isExpired && (
                <span className="text-xs text-amber-500">
                  ({t('event.tooClose')})
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
          
          {/* Call status indicator */}
          {displayEvent.call_alert_sent_at && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {displayEvent.call_alert_answered ? (
                <span className="inline-flex items-center gap-1 text-emerald-500">
                  ✅ {t('event.answered')}
                  {displayEvent.call_alert_answered_at && (
                    <span className="text-muted-foreground ml-1">
                      {t('event.at')} {format(parseISO(displayEvent.call_alert_answered_at), 'HH:mm')}
                    </span>
                  )}
                </span>
              ) : displayEvent.call_alert_outcome === 'missed' ? (
                <span className="inline-flex items-center gap-1 text-amber-500">
                  📞 {t('event.weCalled')} {displayEvent.call_alert_attempts && displayEvent.call_alert_attempts > 1 ? `${displayEvent.call_alert_attempts}x` : ''} - {t('event.notAnswered')}
                </span>
              ) : displayEvent.call_alert_outcome === 'sent' ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  📞 {t('event.callSentAt')} {format(parseISO(displayEvent.call_alert_sent_at), 'HH:mm')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground/60">
                  📞 {t('event.calledNoResult')}
                </span>
              )}
            </div>
          )}
          
          {/* Tooltip when activated */}
          {showCallAlertTooltip && !isExpired && callAlertInfo && (
            <div className="absolute right-0 top-full mt-2 z-10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="bg-foreground text-background text-xs px-3 py-2 rounded-lg shadow-lg max-w-[220px]">
                {t('event.willCallAt').replace('{time}', callAlertInfo.time)} ({callAlertInfo.label})
              </div>
            </div>
          )}
          
          {/* Tooltip for expired events */}
          {isExpired && (
            <p className="text-xs text-muted-foreground/50 mt-1">
              {t('event.notAvailableExpired')}
            </p>
          )}
          
          {/* Tooltip for events too close */}
          {!isExpired && !canEnableCallAlert && (
            <p className="text-xs text-amber-500/80 mt-1">
              {t('event.tooCloseToActivate')}
            </p>
          )}
        </div>
        
        {/* Me Notifique toggle */}
        <div className="relative pl-6">
          <div 
            className="flex items-center justify-between py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Bell className={`w-4 h-4 ${isExpired ? 'text-muted-foreground/50' : 'text-sky-500'}`} />
              <span className={`text-sm ${isExpired ? 'text-muted-foreground/60' : 'text-foreground'}`}>{t('event.notifyMe')}</span>
              {callAlertInfo && !isExpired && (
                <span className="text-xs text-muted-foreground">
                  ({callAlertInfo.label})
                </span>
              )}
            </div>
            <Switch 
              checked={isExpired ? false : notificationEnabled} 
              onCheckedChange={(checked) => handleToggleNotification({stopPropagation: () => {}} as React.MouseEvent, checked)}
              disabled={!event.id || isUpdatingNotification || isExpired}
              className="data-[state=unchecked]:bg-gray-400 data-[state=checked]:bg-sky-500" 
            />
          </div>
          
          {/* Tooltip when activated */}
          {showNotificationTooltip && !isExpired && callAlertInfo && (
            <div className="absolute right-0 top-full mt-2 z-10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="bg-foreground text-background text-xs px-3 py-2 rounded-lg shadow-lg max-w-[220px]">
                {t('event.willNotifyAt').replace('{time}', callAlertInfo.time)} ({callAlertInfo.label})
              </div>
            </div>
          )}
        </div>
        
        {/* Notes/Description */}
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
          {t('event.editDetails')}
        </button>
      )}
    </div>
  );
});

EventCreatedCard.displayName = 'EventCreatedCard';

export default EventCreatedCard;