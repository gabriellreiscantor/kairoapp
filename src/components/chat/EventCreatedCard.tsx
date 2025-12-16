import React, { useState, useEffect } from "react";
import { 
  Calendar, Bell, Phone, MapPin, CheckCircle, Pencil,
  Scissors, Film, Waves, Dumbbell, Briefcase, 
  Heart, ShoppingCart, Utensils, GraduationCap, 
  Music, Plane, Car, Coffee, Users, Gamepad2,
  Stethoscope, DollarSign, Home, CircleDot
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  };
  type?: 'created' | 'updated';
  onEdit?: (eventId: string) => void;
}

// Get dynamic icon based on event title/category
const getEventIcon = (title: string, category?: string) => {
  const titleLower = title.toLowerCase();
  
  // Match by title keywords first
  if (titleLower.includes('barbeir') || titleLower.includes('cabelo') || titleLower.includes('corte') || titleLower.includes('salão') || titleLower.includes('salon')) {
    return <Scissors className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('cinema') || titleLower.includes('filme') || titleLower.includes('movie') || titleLower.includes('netflix')) {
    return <Film className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('piscina') || titleLower.includes('nadar') || titleLower.includes('praia') || titleLower.includes('natação')) {
    return <Waves className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('academia') || titleLower.includes('treino') || titleLower.includes('gym') || titleLower.includes('musculação') || titleLower.includes('crossfit')) {
    return <Dumbbell className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('reunião') || titleLower.includes('meeting') || titleLower.includes('trabalho') || titleLower.includes('escritório')) {
    return <Briefcase className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('médico') || titleLower.includes('medico') || titleLower.includes('consulta') || titleLower.includes('dentista') || titleLower.includes('hospital') || titleLower.includes('exame')) {
    return <Stethoscope className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('mercado') || titleLower.includes('compras') || titleLower.includes('shopping') || titleLower.includes('supermercado') || titleLower.includes('feira')) {
    return <ShoppingCart className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('restaurante') || titleLower.includes('jantar') || titleLower.includes('almoço') || titleLower.includes('lanchonete') || titleLower.includes('comida') || titleLower.includes('pizza')) {
    return <Utensils className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('aula') || titleLower.includes('escola') || titleLower.includes('faculdade') || titleLower.includes('curso') || titleLower.includes('estudar')) {
    return <GraduationCap className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('show') || titleLower.includes('concert') || titleLower.includes('festa') || titleLower.includes('balada') || titleLower.includes('música')) {
    return <Music className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('viagem') || titleLower.includes('voo') || titleLower.includes('aeroporto') || titleLower.includes('férias')) {
    return <Plane className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('carro') || titleLower.includes('oficina') || titleLower.includes('mecânico') || titleLower.includes('uber')) {
    return <Car className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('café') || titleLower.includes('coffee') || titleLower.includes('cafeteria') || titleLower.includes('starbucks')) {
    return <Coffee className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('amigo') || titleLower.includes('familia') || titleLower.includes('família') || titleLower.includes('encontro') || titleLower.includes('visita')) {
    return <Users className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('jogo') || titleLower.includes('game') || titleLower.includes('playstation') || titleLower.includes('xbox') || titleLower.includes('videogame')) {
    return <Gamepad2 className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('namoro') || titleLower.includes('date') || titleLower.includes('aniversário') || titleLower.includes('casamento')) {
    return <Heart className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('banco') || titleLower.includes('pagar') || titleLower.includes('conta') || titleLower.includes('financ')) {
    return <DollarSign className="w-5 h-5 text-primary" />;
  }
  if (titleLower.includes('casa') || titleLower.includes('home') || titleLower.includes('faxina') || titleLower.includes('limpeza')) {
    return <Home className="w-5 h-5 text-primary" />;
  }
  
  // Fallback by category
  const categoryIcons: Record<string, React.ReactNode> = {
    trabalho: <Briefcase className="w-5 h-5 text-primary" />,
    saude: <Stethoscope className="w-5 h-5 text-primary" />,
    pessoal: <Home className="w-5 h-5 text-primary" />,
    fitness: <Dumbbell className="w-5 h-5 text-primary" />,
    social: <Users className="w-5 h-5 text-primary" />,
    financeiro: <DollarSign className="w-5 h-5 text-primary" />,
    educacao: <GraduationCap className="w-5 h-5 text-primary" />,
    lazer: <Gamepad2 className="w-5 h-5 text-primary" />,
  };
  
  return categoryIcons[category || ''] || <CircleDot className="w-5 h-5 text-primary" />;
};

const EventCreatedCard = React.forwardRef<HTMLDivElement, EventCreatedCardProps>(
  ({ event, type = 'created', onEdit }, ref) => {
  
  // Hooks FIRST (must always be at top, before any conditional returns)
  const [callAlertEnabled, setCallAlertEnabled] = useState(event?.call_alert_enabled || false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditButton, setShowEditButton] = useState(true);
  
  // Timer to hide edit button after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEditButton(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
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

  const formatDuration = () => {
    if (!event.event_time) return "Dia inteiro";
    
    if (event.duration_minutes) {
      const startTime = event.event_time;
      const [hours, minutes] = startTime.split(":").map(Number);
      const endMinutes = hours * 60 + minutes + event.duration_minutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      return `até ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    }
    
    return formatTime(event.event_time);
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
        {/* Title row - Calendar on left, dynamic icon on right */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-kairo-orange" />
            <span className="text-base font-semibold text-foreground">{event.title}</span>
          </div>
          {getEventIcon(event.title, event.category)}
        </div>
        
        {/* Date and time row with duration */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground capitalize">{formatDate(event.event_date)}</span>
          <div className="text-right">
            <span className="text-kairo-amber font-medium">{isAllDay ? "Dia inteiro" : formatTime(event.event_time)}</span>
            {!isAllDay && event.duration_minutes && (
              <p className="text-xs text-muted-foreground">{formatDuration()}</p>
            )}
          </div>
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
        
        {/* Notification time */}
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            {event.event_time ? `${formatTime(event.event_time)}, no dia` : "09:00, no dia"}
          </span>
        </div>
        
        {/* Description (if available) */}
        {event.description && (
          <p className="text-xs text-muted-foreground/80 pl-6 -mt-1">
            {event.description}
          </p>
        )}
        
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-sm text-muted-foreground">{event.location}</span>
          </div>
        )}
      </div>
      
      {/* Edit button - visible for 5 seconds */}
      {showEditButton && event.id && onEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(event.id!)}
          className="mt-2 text-muted-foreground hover:text-foreground transition-opacity animate-in fade-in-0"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
      )}
    </div>
  );
});

EventCreatedCard.displayName = 'EventCreatedCard';

export default EventCreatedCard;