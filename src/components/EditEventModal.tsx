import { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronRight, 
  ChevronDown, 
  Bell, 
  Phone,
  Check,
  MapPin,
  Navigation,
  Search,
  X,
  ChevronLeft,
  Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";

interface EventData {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  priority: string | null;
  notification_enabled: boolean | null;
  call_alert_enabled: boolean | null;
  category: string | null;
  status: string | null;
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventData;
  onSave?: () => void;
}

type ScreenView = 'main' | 'location';

const EditEventModal = ({ isOpen, onClose, event, onSave }: EditEventModalProps) => {
  const { toast } = useToast();
  const { isLoading: isGeoLoading, error: geoError, getCurrentAddress, searchAddresses } = useGeolocation();
  const [screenView, setScreenView] = useState<ScreenView>('main');
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [eventTime, setEventTime] = useState("12:00");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [callAlertEnabled, setCallAlertEnabled] = useState(false);
  const [notes, setNotes] = useState("");

  // Initialize form with event data
  useEffect(() => {
    if (event && isOpen) {
      setTitle(event.title || "");
      setLocation(event.location || "");
      setEventDate(event.event_date ? new Date(event.event_date + 'T00:00:00') : new Date());
      setEventTime(event.event_time?.slice(0, 5) || "12:00");
      setNotificationEnabled(event.notification_enabled ?? true);
      setCallAlertEnabled(event.call_alert_enabled ?? false);
      setNotes(event.description || "");
    }
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "O título do evento é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: title.trim(),
          event_date: format(eventDate, 'yyyy-MM-dd'),
          event_time: eventTime,
          location: location.trim() || null,
          description: notes.trim() || null,
          notification_enabled: notificationEnabled,
          call_alert_enabled: callAlertEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Evento atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o evento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateDisplay = (date: Date) => {
    return format(date, "d 'de' MMM. 'de' yyyy", { locale: ptBR });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T00:00:00');
    if (!isNaN(newDate.getTime())) {
      setEventDate(newDate);
    }
  };

  // Handle location search with debounce
  useEffect(() => {
    if (!locationSearch || locationSearch.length < 3) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchAddresses(locationSearch);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [locationSearch, searchAddresses]);

  // Handle current location
  const handleGetCurrentLocation = async () => {
    const result = await getCurrentAddress();
    if (result) {
      setLocation(result.address);
      setScreenView('main');
      toast({
        title: "Localização obtida",
        description: "Seu endereço foi definido com sucesso.",
      });
    } else if (geoError) {
      toast({
        title: "Erro",
        description: geoError,
        variant: "destructive",
      });
    }
  };

  // Location Screen
  if (screenView === 'location') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button 
            onClick={() => {
              setScreenView('main');
              setLocationSearch("");
              setSearchResults([]);
            }}
            className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Local do Evento</h1>
          <button 
            onClick={() => {
              setScreenView('main');
              setLocationSearch("");
              setSearchResults([]);
            }}
            className="text-primary font-medium"
          >
            Salvar
          </button>
        </header>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="bg-kairo-surface-2 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Buscar endereço..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
            />
            {isSearching && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
            {locationSearch && !isSearching && (
              <button onClick={() => {
                setLocationSearch("");
                setSearchResults([]);
              }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Current Location */}
        <button 
          onClick={handleGetCurrentLocation}
          disabled={isGeoLoading}
          className="flex items-center gap-3 px-4 py-4 border-b border-border/10 disabled:opacity-50"
        >
          {isGeoLoading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Navigation className="w-5 h-5 text-primary" />
          )}
          <span className="text-foreground">
            {isGeoLoading ? "Obtendo localização..." : "Usar Localização Atual"}
          </span>
        </button>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="px-4 py-2 flex-1 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">Resultados</p>
            {searchResults.map((result, index) => (
              <button 
                key={index}
                onClick={() => {
                  setLocation(result.display_name);
                  setLocationSearch("");
                  setSearchResults([]);
                  setScreenView('main');
                }}
                className="flex items-start gap-3 py-3 border-b border-border/10 w-full text-left"
              >
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm line-clamp-2">{result.display_name}</p>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {locationSearch.length >= 3 && !isSearching && searchResults.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-muted-foreground">Nenhum resultado encontrado</p>
          </div>
        )}
      </div>
    );
  }

  // Main Screen
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-area-top">
        <button onClick={onClose} className="text-foreground font-medium">
          Cancelar
        </button>
        <h1 className="text-lg font-semibold text-foreground">Editar Evento</h1>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="text-primary font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar
        </button>
      </header>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-8">
        {/* Title Card */}
        <div className="mx-4 mb-4 mt-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full px-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Date, Time & Location Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          {/* Date */}
          <label className="px-4 py-4 flex items-center justify-between border-b border-border/10 cursor-pointer relative min-h-[56px]">
            <span className="text-foreground pointer-events-none">Data</span>
            <span className="bg-kairo-surface-3 px-3 py-2 rounded-lg text-sm text-foreground pointer-events-none">
              {formatDateDisplay(eventDate)}
            </span>
            <input
              type="date"
              value={format(eventDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
          </label>

          {/* Time */}
          <label className="px-4 py-4 flex items-center justify-between border-b border-border/10 cursor-pointer relative min-h-[56px]">
            <span className="text-foreground pointer-events-none">Hora</span>
            <span className="bg-kairo-surface-3 px-3 py-2 rounded-lg text-sm text-foreground pointer-events-none">
              {eventTime}
            </span>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
          </label>

          {/* Location */}
          <button 
            onClick={() => setScreenView('location')}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <span className="text-foreground">Local</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${location ? 'text-foreground' : 'text-muted-foreground'} max-w-[200px] truncate`}>
                {location || 'Adicionar'}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </button>
        </div>

        {/* Alerts Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          {/* Notification Toggle */}
          <button 
            onClick={() => setNotificationEnabled(!notificationEnabled)}
            className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                notificationEnabled ? 'bg-gradient-to-br from-primary/80 to-pink-500' : 'bg-kairo-surface-3'
              }`}>
                <Bell className={`w-5 h-5 ${notificationEnabled ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-left">
                <span className="text-foreground">Notificação Push</span>
                <p className="text-xs text-muted-foreground">Receber alerta no celular</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
              notificationEnabled ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {notificationEnabled && <Check className="w-4 h-4 text-background" />}
            </div>
          </button>

          {/* Call Alert Toggle */}
          <button 
            onClick={() => setCallAlertEnabled(!callAlertEnabled)}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                callAlertEnabled ? 'bg-gradient-to-br from-primary/80 to-pink-500' : 'bg-kairo-surface-3'
              }`}>
                <Phone className={`w-5 h-5 ${callAlertEnabled ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-left">
                <span className="text-foreground">Me ligue pra lembrar</span>
                <p className="text-xs text-muted-foreground">O Kairo vai te ligar pra não esquecer do evento</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
              callAlertEnabled ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {callAlertEnabled && <Check className="w-4 h-4 text-background" />}
            </div>
          </button>
        </div>

        {/* Notes Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas"
            rows={4}
            className="w-full px-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default EditEventModal;
