import React, { useState } from "react";
import { Calendar, Bell, Phone, MapPin, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

interface EventCreatedCardProps {
  event: {
    id?: string;
    title: string;
    event_date: string;
    event_time?: string;
    location?: string;
    category?: string;
    notification_enabled?: boolean;
    call_alert_enabled?: boolean;
  };
  type?: 'created' | 'updated';
}

const getCategoryEmoji = (category?: string) => {
  const emojis: Record<string, string> = {
    trabalho: "💼",
    saude: "🩺",
    pessoal: "🏠",
    fitness: "💪",
    social: "👥",
    financeiro: "💰",
    educacao: "📚",
    lazer: "🎮",
    geral: "🔴",
  };
  return emojis[category || "geral"] || "🔴";
};

const EventCreatedCard = React.forwardRef<HTMLDivElement, EventCreatedCardProps>(
  ({ event, type = 'created' }, ref) => {
  const [callAlertEnabled, setCallAlertEnabled] = useState(event.call_alert_enabled || false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleToggleCallAlert = async (checked: boolean) => {
    if (!event.id || isUpdating) return;
    
    setIsUpdating(true);
    setCallAlertEnabled(checked);
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ call_alert_enabled: checked })
        .eq('id', event.id);
      
      if (error) {
        console.error('Error updating call alert:', error);
        setCallAlertEnabled(!checked); // Revert on error
      }
    } catch (err) {
      console.error('Error updating call alert:', err);
      setCallAlertEnabled(!checked); // Revert on error
    } finally {
      setIsUpdating(false);
    }
  };

  const isAllDay = !event.event_time;

  return (
    <div ref={ref} className="w-full max-w-[320px] animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header text with success icon */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <p className="text-sm text-muted-foreground">
          {type === 'updated' ? 'Evento Atualizado' : 'Evento Criado'}
        </p>
      </div>
      
      {/* Event Card */}
      <div className="bg-kairo-surface-2 border border-border/30 rounded-2xl p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span>{getCategoryEmoji(event.category)}</span>
            <span className="text-base font-semibold text-foreground">{event.title}</span>
          </div>
          <Calendar className="w-5 h-5 text-kairo-orange" />
        </div>
        
        {/* Date and time row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground capitalize">{formatDate(event.event_date)}</span>
          <span className="text-kairo-amber font-medium">{isAllDay ? "Dia inteiro" : formatTime(event.event_time)}</span>
        </div>
        
        {/* Me Ligue toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-500" />
            <span className="text-sm text-foreground">Me Ligue</span>
          </div>
          <Switch 
            checked={callAlertEnabled} 
            onCheckedChange={handleToggleCallAlert}
            disabled={!event.id || isUpdating}
            className="data-[state=unchecked]:bg-gray-400 data-[state=checked]:bg-green-500" 
          />
        </div>
        
        {/* Notification info */}
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            {event.event_time ? `${formatTime(event.event_time)}, no dia` : "09:00, no dia"}
          </span>
        </div>
        
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-sm text-muted-foreground">{event.location}</span>
          </div>
        )}
      </div>
    </div>
  );
});

EventCreatedCard.displayName = 'EventCreatedCard';

export default EventCreatedCard;
