import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
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
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: {
    title: string;
    date: string;
    time: string;
    priority: string;
    alertType: string;
    repeat: string;
    notes: string;
  }) => void;
}

type ScreenView = 'main' | 'location' | 'emoji';

interface Alert {
  id: number;
  time: string;
  daysBefore: number;
}

const REPEAT_OPTIONS = [
  { value: 'never', label: 'Nunca' },
  { value: 'daily', label: 'Todos os Dias' },
  { value: 'every2days', label: 'A cada 2 dias' },
  { value: 'weekly', label: 'Todas as Semanas' },
  { value: 'every2weeks', label: 'Todas as 2 Semanas' },
  { value: 'monthly', label: 'Todos os Meses' },
  { value: 'yearly', label: 'Todos os Anos' },
];

const ALERT_OPTIONS = [
  { value: 'none', label: 'Nenhum' },
  { value: '5min', label: '5 minutos antes' },
  { value: '15min', label: '15 minutos antes' },
  { value: '30min', label: '30 minutos antes' },
  { value: '1hour', label: '1 hora antes' },
  { value: '1day', label: '1 dia antes' },
];

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '🫠', '😉', '😊', '😇', '🥰', '😍',
  '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛',
  '😜', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫',
  '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥',
  '😏', '😒', '🙄', '😬', '🤤', '😮‍💨', '😪', '😴',
  '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯',
  '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤',
];

const CreateEventModal = ({ isOpen, onClose, onSave }: CreateEventModalProps) => {
  const { toast } = useToast();
  const { isLoading: isGeoLoading, error: geoError, getCurrentAddress, searchAddresses } = useGeolocation();
  const [screenView, setScreenView] = useState<ScreenView>('main');
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [startTime, setStartTime] = useState("05:00");
  const [endTime, setEndTime] = useState("06:00");
  const [repeat, setRepeat] = useState("never");
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [callAlertEnabled, setCallAlertEnabled] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([{ id: 1, time: '15min', daysBefore: 0 }]);
  const [notes, setNotes] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📅");

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      title,
      date: format(startDate, 'yyyy-MM-dd'),
      time: startTime,
      priority: 'medium',
      alertType: notificationEnabled && callAlertEnabled ? 'both' : notificationEnabled ? 'notification' : callAlertEnabled ? 'call' : 'none',
      repeat,
      notes,
    });
    onClose();
  };

  const addAlert = () => {
    if (alerts.length < 5) {
      setAlerts([...alerts, { id: alerts.length + 1, time: 'none', daysBefore: 0 }]);
    }
  };

  const formatDateDisplay = (date: Date) => {
    return format(date, "d 'de' MMM. 'de' yyyy", { locale: ptBR });
  };

  const getRepeatLabel = () => {
    return REPEAT_OPTIONS.find(o => o.value === repeat)?.label || 'Nunca';
  };

  const getAlertLabel = (alertTime: string) => {
    return ALERT_OPTIONS.find(o => o.value === alertTime)?.label || 'Nenhum';
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

  // Emoji Picker Screen
  if (screenView === 'emoji') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button onClick={onClose} className="text-foreground font-medium">
            Cancelar
          </button>
          <h1 className="text-lg font-semibold text-foreground">Criar Novo Evento</h1>
          <button onClick={handleSave} className="text-primary font-medium">
            Salvar
          </button>
        </header>

        {/* Emoji Preview */}
        <div className="flex justify-center py-8">
          <div className="w-28 h-28 rounded-full bg-kairo-surface-2 flex items-center justify-center">
            <span className="text-5xl">{selectedEmoji}</span>
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="flex-1 px-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Sorrisos e Pessoas</p>
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedEmoji(emoji);
                  setScreenView('main');
                }}
                className="text-2xl p-1 hover:bg-kairo-surface-2 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
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
        <h1 className="text-lg font-semibold text-foreground">Criar Novo Evento</h1>
        <button 
          onClick={handleSave} 
          className="text-primary font-medium"
        >
          Salvar
        </button>
      </header>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-8">
        {/* Emoji Picker */}
        <div className="flex justify-center py-6">
          <button 
            onClick={() => setScreenView('emoji')}
            className="w-28 h-28 rounded-full bg-kairo-surface-2 flex items-center justify-center"
          >
            <span className="text-5xl">{selectedEmoji}</span>
          </button>
        </div>

        {/* Title & Location Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full px-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border/10"
          />
          <button 
            onClick={() => setScreenView('location')}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <span className={location ? 'text-foreground' : 'text-muted-foreground'}>
              {location || 'Local'}
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Date & Time Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          {/* All Day Toggle */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-border/10">
            <span className="text-foreground">Dia inteiro</span>
            <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>

          {/* Start Date/Time */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-border/10">
            <span className="text-foreground">De</span>
            <div className="flex items-center gap-2">
              <button className="bg-kairo-surface-3 px-3 py-2 rounded-lg text-sm text-foreground">
                {formatDateDisplay(startDate)}
              </button>
              {!isAllDay && (
                <button className="bg-kairo-surface-3 px-3 py-2 rounded-lg text-sm text-foreground">
                  {startTime}
                </button>
              )}
            </div>
          </div>

          {/* End Date/Time */}
          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-foreground">Para</span>
            <div className="flex items-center gap-2">
              <button className="bg-kairo-surface-3 px-3 py-2 rounded-lg text-sm text-foreground">
                {formatDateDisplay(endDate)}
              </button>
              {!isAllDay && (
                <button className="bg-kairo-surface-3 px-3 py-2 rounded-lg text-sm text-foreground">
                  {endTime}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Repeat Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden relative">
          <button 
            onClick={() => setShowRepeatDropdown(!showRepeatDropdown)}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <span className="text-foreground">Repetir</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>{getRepeatLabel()}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>

          {/* Dropdown */}
          {showRepeatDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 mx-4 bg-kairo-surface-3 rounded-2xl overflow-hidden z-10 shadow-lg border border-border/20">
              {REPEAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setRepeat(option.value);
                    setShowRepeatDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-kairo-surface-2 transition-colors"
                >
                  <span className="text-foreground">{option.label}</span>
                  {repeat === option.value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color & Calendar Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <button className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10">
            <span className="text-foreground">Cor do Evento</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-sm">Mesma coisa que<br/>o calendário</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>
          <button className="w-full px-4 py-4 flex items-center justify-between">
            <span className="text-foreground">Calendário</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-3 h-3 rounded-full bg-primary" />
              <span>Kairo</span>
              <ChevronDown className="w-4 h-4" />
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
            className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                callAlertEnabled ? 'bg-gradient-to-br from-primary/80 to-pink-500' : 'bg-kairo-surface-3'
              }`}>
                <Phone className={`w-5 h-5 ${callAlertEnabled ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-left">
                <span className="text-foreground">Alerta de Chamada</span>
                <p className="text-xs text-muted-foreground">Receber ligação simulada</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
              callAlertEnabled ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {callAlertEnabled && <Check className="w-4 h-4 text-background" />}
            </div>
          </button>

          {/* Alert List */}
          {alerts.map((alert, index) => (
            <div 
              key={alert.id}
              className="px-4 py-4 flex items-center justify-between border-b border-border/10"
            >
              <span className="text-foreground">Alerta {index + 1}</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>{getAlertLabel(alert.time)}</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          ))}

          {/* Add Alert Button */}
          {alerts.length < 5 && (
            <button 
              onClick={addAlert}
              className="w-full px-4 py-4 flex items-center justify-center gap-2 text-foreground"
            >
              <Plus className="w-5 h-5" />
              <span>Adicionar Alerta</span>
            </button>
          )}
        </div>

        {/* Notes Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas"
            rows={5}
            className="w-full px-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
