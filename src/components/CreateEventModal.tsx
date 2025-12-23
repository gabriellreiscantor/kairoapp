import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronRight, 
  Plus, 
  Bell, 
  Phone,
  Check,
  MapPin,
  Navigation,
  Search,
  X,
  ChevronLeft,
  Loader2,
  Trash2,
  Palette,
  Repeat
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useGeolocation } from "@/hooks/useGeolocation";
import { DatePicker, TimePicker } from "@/components/ui/date-time-picker";
import { EVENT_COLORS, REPEAT_OPTIONS, ALERT_OPTIONS, EVENT_EMOJIS, getColorClassName, getRepeatLabel, getAlertLabel } from "@/lib/event-constants";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: {
    title: string;
    date: string;
    time: string | null;
    priority: string;
    alertType: string;
    repeat: string;
    notes: string;
    emoji: string;
    is_all_day: boolean;
    color: string;
    alerts: { time: string }[];
    location: string;
  }) => void;
}

type ScreenView = 'main' | 'location' | 'emoji' | 'repeat' | 'color' | 'alerts';

interface Alert {
  time: string;
}

const CreateEventModal = ({ isOpen, onClose, onSave }: CreateEventModalProps) => {
  const { isLoading: isGeoLoading, getCurrentAddress, searchAddresses } = useGeolocation();
  const [screenView, setScreenView] = useState<ScreenView>('main');
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState("12:00");
  const [repeat, setRepeat] = useState("never");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [callAlertEnabled, setCallAlertEnabled] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([{ time: "1hour" }]);
  const [notes, setNotes] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📅");
  const [color, setColor] = useState("primary");

  // Swipe to delete
  const [swipingAlertIndex, setSwipingAlertIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScreenView('main');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      title,
      date: format(startDate, 'yyyy-MM-dd'),
      time: isAllDay ? null : startTime,
      priority: 'medium',
      alertType: notificationEnabled && callAlertEnabled ? 'both' : notificationEnabled ? 'notification' : callAlertEnabled ? 'call' : 'none',
      repeat,
      notes,
      emoji: selectedEmoji,
      is_all_day: isAllDay,
      color,
      alerts,
      location,
    });
    // Reset form
    setTitle("");
    setLocation("");
    setIsAllDay(false);
    setStartDate(new Date());
    setStartTime("12:00");
    setRepeat("never");
    setNotificationEnabled(true);
    setCallAlertEnabled(false);
    setAlerts([{ time: "1hour" }]);
    setNotes("");
    setSelectedEmoji("📅");
    setColor("primary");
    onClose();
  };

  const addAlert = () => {
    if (alerts.length < 10) {
      setAlerts([...alerts, { time: "1hour" }]);
    }
  };

  const removeAlert = (index: number) => {
    setAlerts(alerts.filter((_, i) => i !== index));
  };

  const updateAlertTime = (index: number, time: string) => {
    const newAlerts = [...alerts];
    newAlerts[index] = { time };
    setAlerts(newAlerts);
  };

  // Swipe handlers
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingAlertIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipingAlertIndex === null) return;
    const diff = touchStartX.current - e.touches[0].clientX;
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 80));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 60 && swipingAlertIndex !== null) {
      removeAlert(swipingAlertIndex);
    }
    setSwipeOffset(0);
    setSwipingAlertIndex(null);
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

  const handleGetCurrentLocation = async () => {
    const result = await getCurrentAddress();
    if (result) {
      setLocation(result.address);
      setScreenView('main');
    }
  };

  // Location Screen
  if (screenView === 'location') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button onClick={() => { setScreenView('main'); setLocationSearch(""); setSearchResults([]); }} className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Local do Evento</h1>
          <button onClick={() => { setScreenView('main'); setLocationSearch(""); setSearchResults([]); }} className="text-primary font-medium">Salvar</button>
        </header>

        <div className="px-4 mb-4">
          <div className="bg-kairo-surface-2 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input type="text" value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} placeholder="Buscar endereço..." className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none" />
            {isSearching && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
            {locationSearch && !isSearching && (
              <button onClick={() => { setLocationSearch(""); setSearchResults([]); }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <button onClick={handleGetCurrentLocation} disabled={isGeoLoading} className="flex items-center gap-3 px-4 py-4 border-b border-border/10 disabled:opacity-50">
          {isGeoLoading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Navigation className="w-5 h-5 text-primary" />}
          <span className="text-foreground">{isGeoLoading ? "Obtendo localização..." : "Usar Localização Atual"}</span>
        </button>

        {searchResults.length > 0 && (
          <div className="px-4 py-2 flex-1 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">Resultados</p>
            {searchResults.map((result, index) => (
              <button key={index} onClick={() => { setLocation(result.display_name); setLocationSearch(""); setSearchResults([]); setScreenView('main'); }} className="flex items-start gap-3 py-3 border-b border-border/10 w-full text-left">
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm line-clamp-2">{result.display_name}</p>
              </button>
            ))}
          </div>
        )}

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
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button onClick={() => setScreenView('main')} className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Emoji do Evento</h1>
          <div className="w-10" />
        </header>

        <div className="flex justify-center py-8">
          <div className={`w-24 h-24 rounded-full ${getColorClassName(color)} flex items-center justify-center`}>
            <span className="text-4xl">{selectedEmoji}</span>
          </div>
        </div>

        <div className="flex-1 px-4 overflow-y-auto pb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Emojis</p>
          <div className="grid grid-cols-8 gap-2">
            {EVENT_EMOJIS.map((emoji, idx) => (
              <button key={idx} onClick={() => { setSelectedEmoji(emoji); setScreenView('main'); }} className={`text-2xl p-2 rounded-lg transition-colors ${selectedEmoji === emoji ? 'bg-primary/20' : 'hover:bg-kairo-surface-2'}`}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Repeat Screen
  if (screenView === 'repeat') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button onClick={() => setScreenView('main')} className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Repetir</h1>
          <div className="w-10" />
        </header>

        <div className="flex-1 px-4 pt-4">
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            {REPEAT_OPTIONS.map((option) => (
              <button key={option.value} onClick={() => { setRepeat(option.value); setScreenView('main'); }} className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10 last:border-b-0">
                <span className="text-foreground">{option.label}</span>
                {repeat === option.value && <Check className="w-5 h-5 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Color Screen
  if (screenView === 'color') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button onClick={() => setScreenView('main')} className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Cor do Evento</h1>
          <div className="w-10" />
        </header>

        <div className="flex justify-center py-8">
          <div className={`w-24 h-24 rounded-full ${getColorClassName(color)} flex items-center justify-center`}>
            <span className="text-4xl">{selectedEmoji}</span>
          </div>
        </div>

        <div className="flex-1 px-4">
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            {EVENT_COLORS.map((c) => (
              <button key={c.value} onClick={() => { setColor(c.value); setScreenView('main'); }} className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full ${c.className}`} />
                  <span className="text-foreground">{c.label}</span>
                </div>
                {color === c.value && <Check className="w-5 h-5 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Alerts Screen
  if (screenView === 'alerts') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button onClick={() => setScreenView('main')} className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Alertas</h1>
          <div className="w-10" />
        </header>

        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-3">Arraste para a esquerda ou clique no X para remover</p>
          
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden mb-4">
            {alerts.map((alert, index) => (
              <div 
                key={index} 
                className="relative overflow-hidden border-b border-border/10 last:border-b-0"
                onTouchStart={(e) => handleTouchStart(index, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div 
                  className="px-4 py-4 flex items-center justify-between bg-kairo-surface-2 transition-transform"
                  style={{ transform: swipingAlertIndex === index ? `translateX(-${swipeOffset}px)` : 'translateX(0)' }}
                >
                  <span className="text-foreground">Alerta {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <select 
                      value={alert.time} 
                      onChange={(e) => updateAlertTime(index, e.target.value)}
                      className="bg-transparent text-muted-foreground text-right focus:outline-none"
                    >
                      {ALERT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => removeAlert(index)} 
                      className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center" style={{ transform: `translateX(${80 - swipeOffset}px)` }}>
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
              </div>
            ))}
          </div>

          {alerts.length < 10 && (
            <button onClick={addAlert} className="w-full bg-kairo-surface-2 rounded-2xl px-4 py-4 flex items-center justify-center gap-2 text-foreground">
              <Plus className="w-5 h-5" />
              <span>Adicionar Alerta</span>
            </button>
          )}
          
          <p className="text-xs text-muted-foreground text-center mt-4">Máximo de 10 alertas</p>
        </div>
      </div>
    );
  }

  // Main Screen
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in overflow-hidden">
      <header className="flex items-center justify-between px-4 py-4 safe-area-top">
        <button onClick={onClose} className="text-foreground font-medium">Cancelar</button>
        <h1 className="text-lg font-semibold text-foreground">Criar Novo Evento</h1>
        <button onClick={handleSave} className="text-primary font-medium">Salvar</button>
      </header>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-8">
        {/* Emoji Picker */}
        <div className="flex justify-center py-6">
          <button onClick={() => setScreenView('emoji')} className={`w-24 h-24 rounded-full ${getColorClassName(color)} flex items-center justify-center shadow-lg transition-transform hover:scale-105`}>
            <span className="text-4xl">{selectedEmoji}</span>
          </button>
        </div>

        {/* Title Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full px-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>

        {/* All Day & Date/Time Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          {/* All Day Toggle */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-border/10">
            <span className="text-foreground">Dia inteiro</span>
            <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>

          {/* Date */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-border/10">
            <span className="text-foreground">Data</span>
            <DatePicker date={startDate} onDateChange={setStartDate} />
          </div>

          {/* Time - only show if not all day */}
          {!isAllDay && (
            <div className="px-4 py-4 flex items-center justify-between border-b border-border/10">
              <span className="text-foreground">Hora</span>
              <TimePicker time={startTime} onTimeChange={setStartTime} />
            </div>
          )}

          {/* Location */}
          <button onClick={() => setScreenView('location')} className="w-full px-4 py-4 flex items-center justify-between gap-3">
            <span className="text-foreground flex-shrink-0">Local</span>
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
              <span className={`text-sm text-right truncate ${location ? 'text-foreground' : 'text-muted-foreground'}`}>
                {location || 'Adicionar'}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </button>
        </div>

        {/* Repeat Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <button onClick={() => setScreenView('repeat')} className="w-full px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Repeat className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Repetir</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{getRepeatLabel(repeat)}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>

        {/* Color Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <button onClick={() => setScreenView('color')} className="w-full px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Cor do Evento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full ${getColorClassName(color)}`} />
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        </div>

        {/* Alerts Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          {/* Notification Toggle */}
          <button onClick={() => setNotificationEnabled(!notificationEnabled)} className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notificationEnabled ? 'bg-gradient-to-br from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3]' : 'bg-kairo-surface-3'}`}>
                <Bell className={`w-5 h-5 ${notificationEnabled ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-left">
                <span className="text-foreground">Notificação Push</span>
                <p className="text-xs text-muted-foreground">Receber alerta no celular</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${notificationEnabled ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
              {notificationEnabled && <Check className="w-4 h-4 text-background" />}
            </div>
          </button>

          {/* Call Alert Toggle */}
          <button onClick={() => setCallAlertEnabled(!callAlertEnabled)} className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${callAlertEnabled ? 'bg-gradient-to-br from-primary/80 to-pink-500' : 'bg-kairo-surface-3'}`}>
                <Phone className={`w-5 h-5 ${callAlertEnabled ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-left">
                <span className="text-foreground">Me ligue pra lembrar</span>
                <p className="text-xs text-muted-foreground">1 hora antes do evento</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${callAlertEnabled ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
              {callAlertEnabled && <Check className="w-4 h-4 text-background" />}
            </div>
          </button>

          {/* Alerts List */}
          <button onClick={() => setScreenView('alerts')} className="w-full px-4 py-4 flex items-center justify-between">
            <span className="text-foreground">Alertas</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{alerts.length} alerta{alerts.length !== 1 ? 's' : ''}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>

        {/* Notes Card */}
        <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" rows={4} className="w-full px-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
