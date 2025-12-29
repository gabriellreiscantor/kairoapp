import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { 
  ChevronRight, 
  Bell, 
  Phone,
  Check,
  MapPin,
  Navigation,
  Search,
  X,
  ChevronLeft,
  Loader2,
  ChevronDown,
  Plus,
  Trash2,
  Palette,
  Repeat,
  Clock,
  RefreshCw,
  Lock,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { DatePicker, TimePicker } from "@/components/ui/date-time-picker";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EVENT_COLORS, REPEAT_OPTIONS, ALERT_OPTIONS, EVENT_EMOJIS, getColorClassName, getRepeatLabel, getAlertLabel, getAvailableAlertOptions, getBestValidAlert, getAlertMinutes } from "@/lib/event-constants";
import { useLanguage } from "@/contexts/LanguageContext";

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
  emoji?: string | null;
  is_all_day?: boolean | null;
  repeat?: string | null;
  color?: string | null;
  alerts?: { time: string }[] | null;
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventData;
  onSave?: () => void;
  onDelete?: (deletedEvent: EventData) => void;
}

type ScreenView = 'main' | 'location' | 'emoji' | 'repeat' | 'color' | 'alerts';

interface Alert {
  time: string;
}

const EditEventModal = ({ isOpen, onClose, event, onSave, onDelete }: EditEventModalProps) => {
  const { t, getDateLocale } = useLanguage();
  const dateLocale = getDateLocale();
  const { isLoading: isGeoLoading, getCurrentAddress, searchAddresses } = useGeolocation();
  const [screenView, setScreenView] = useState<ScreenView>('main');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showReactivateSheet, setShowReactivateSheet] = useState(false);
  
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
  
  // New fields
  const [emoji, setEmoji] = useState("📅");
  const [isAllDay, setIsAllDay] = useState(false);
  const [repeat, setRepeat] = useState("never");
  const [color, setColor] = useState("primary");
  const [alerts, setAlerts] = useState<Alert[]>([{ time: "1hour" }]);
  
  // Alert time picker sheet
  const [alertSheetOpen, setAlertSheetOpen] = useState(false);
  const [editingAlertIndex, setEditingAlertIndex] = useState<number | null>(null);
  
  // Repeat picker sheet
  const [repeatSheetOpen, setRepeatSheetOpen] = useState(false);
  
  // Swipe to delete
  const [swipingAlertIndex, setSwipingAlertIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  
  // Track if initial data has been loaded to prevent re-initialization on re-renders (e.g., theme change)
  const initialDataLoadedRef = useRef(false);

  // Calculate if event is expired (already happened) - only for non-recurring events
  const isExpired = useMemo(() => {
    if (!event) return false;
    // If user is reactivating, don't show as expired
    if (isReactivating) return false;
    // Recurring events never expire
    if (event.repeat && event.repeat !== 'never') return false;
    
    // Parse date components explicitly to avoid timezone issues
    const [year, month, day] = event.event_date.split('-').map(Number);
    const eventDateTime = event.event_time 
      ? (() => {
          const [hours, minutes] = event.event_time.split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes, 0, 0);
        })()
      : new Date(year, month - 1, day, 23, 59, 59, 0);
    
    return eventDateTime < new Date();
  }, [event, isReactivating]);

  // Initialize form with event data - ONLY ONCE when modal opens
  useEffect(() => {
    if (event && isOpen && !initialDataLoadedRef.current) {
      setTitle(event.title || "");
      setLocation(event.location || "");
      // Parse date explicitly to avoid timezone issues
      if (event.event_date) {
        const [year, month, day] = event.event_date.split('-').map(Number);
        setEventDate(new Date(year, month - 1, day, 0, 0, 0, 0));
      } else {
        setEventDate(new Date());
      }
      setEventTime(event.event_time?.slice(0, 5) || "12:00");
      setNotificationEnabled(event.notification_enabled ?? true);
      setCallAlertEnabled(event.call_alert_enabled ?? false);
      setNotes(event.description || "");
      setEmoji(event.emoji || "📅");
      setIsAllDay(event.is_all_day ?? false);
      setRepeat(event.repeat || "never");
      setColor(event.color || "primary");
      
      // Use intelligent alert fallback if no alerts are set
      if (event.alerts && Array.isArray(event.alerts) && event.alerts.length > 0) {
        setAlerts(event.alerts);
      } else {
        // Calculate best alert based on time until event
        const eventDateObj = event.event_date ? (() => {
          const [year, month, day] = event.event_date.split('-').map(Number);
          return new Date(year, month - 1, day, 0, 0, 0, 0);
        })() : new Date();
        const availableOptions = getAvailableAlertOptions(eventDateObj, event.event_time, event.is_all_day ?? false);
        // Pick the largest available alert time (most advance notice)
        const bestAlert = availableOptions.length > 0 ? availableOptions[availableOptions.length - 1].value : 'exact';
        setAlerts([{ time: bestAlert }]);
      }
      
      setScreenView('main');
      setIsReactivating(false);
      
      // Mark as loaded to prevent re-initialization on re-renders (e.g., theme change)
      initialDataLoadedRef.current = true;
    }
  }, [event, isOpen]);

  // Reset the loaded flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      initialDataLoadedRef.current = false;
    }
  }, [isOpen]);

  // Calculate available alert options based on event date/time
  const availableAlertOptions = useMemo(() => {
    return getAvailableAlertOptions(eventDate, isAllDay ? null : eventTime, isAllDay);
  }, [eventDate, eventTime, isAllDay]);

  // Update alerts when available options change (e.g., user changes time)
  useEffect(() => {
    const updatedAlerts = alerts.map(alert => ({
      time: getBestValidAlert(alert.time, availableAlertOptions)
    }));
    
    // Only update if there are actual changes
    const hasChanges = updatedAlerts.some((alert, idx) => alert.time !== alerts[idx].time);
    if (hasChanges) {
      setAlerts(updatedAlerts);
    }
  }, [availableAlertOptions]);

  if (!isOpen) return null;

  // Handle reactivation with new date/time
  const handleReactivate = () => {
    // Set a new future date (tomorrow at noon by default)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    setEventDate(tomorrow);
    setEventTime("12:00");
    setIsReactivating(true);
    setShowReactivateSheet(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      // Calculate call_alert_scheduled_at based on the first alert time
      // This synchronizes the Me Ligue time with the alert configuration
      let callAlertScheduledAt: string | null = null;
      if (!isAllDay && eventTime && alerts.length > 0) {
        const alertMinutes = getAlertMinutes(alerts[0].time);
        const [hours, minutes] = eventTime.split(':').map(Number);
        const year = eventDate.getFullYear();
        const month = eventDate.getMonth();
        const day = eventDate.getDate();
        const eventDateTime = new Date(year, month, day, hours, minutes, 0, 0);
        const callTime = new Date(eventDateTime.getTime() - alertMinutes * 60 * 1000);
        
        // Only set if call time is in the future
        if (callTime > new Date()) {
          callAlertScheduledAt = callTime.toISOString();
        }
      }

      const { error } = await supabase
        .from('events')
        .update({
          title: title.trim(),
          event_date: format(eventDate, 'yyyy-MM-dd'),
          event_time: isAllDay ? null : eventTime,
          location: location.trim() || null,
          description: notes.trim() || null,
          notification_enabled: notificationEnabled,
          call_alert_enabled: callAlertEnabled,
          emoji,
          is_all_day: isAllDay,
          repeat,
          color,
          alerts: JSON.parse(JSON.stringify(alerts)),
          updated_at: new Date().toISOString(),
          // Sync call_alert_scheduled_at with alert time
          call_alert_scheduled_at: callAlertScheduledAt,
          // Reset call tracking when event is modified
          call_alert_sent_at: null,
        })
        .eq('id', event.id);

      if (error) throw error;

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error updating event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      // Call onDelete with the deleted event data so chat can show the deleted card
      onDelete?.(event);
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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

  const handleGetCurrentLocation = async () => {
    const result = await getCurrentAddress();
    if (result) {
      setLocation(result.address);
      setScreenView('main');
    }
  };

  const addAlert = () => {
    if (alerts.length < 10) {
      // Add alert with best available time
      const bestAlert = availableAlertOptions.length > 0 ? availableAlertOptions[availableAlertOptions.length - 1].value : '1hour';
      setAlerts([...alerts, { time: bestAlert }]);
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

  const openAlertPicker = (index: number) => {
    setEditingAlertIndex(index);
    setAlertSheetOpen(true);
  };

  const selectAlertTime = (time: string) => {
    if (editingAlertIndex !== null) {
      updateAlertTime(editingAlertIndex, time);
    }
    setAlertSheetOpen(false);
    setEditingAlertIndex(null);
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

  // Location Screen
  if (screenView === 'location') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button 
            onClick={() => { setScreenView('main'); setLocationSearch(""); setSearchResults([]); }}
            className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('modal.eventLocation')}</h1>
          <button onClick={() => { setScreenView('main'); setLocationSearch(""); setSearchResults([]); }} className="text-primary font-medium">
            {t('common.save')}
          </button>
        </header>

        <div className="px-4 mb-4">
          <div className="bg-kairo-surface-2 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder={t('modal.searchAddress')}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
            />
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
          <span className="text-foreground">{isGeoLoading ? t('modal.gettingLocation') : t('modal.useCurrentLocation')}</span>
        </button>

        {searchResults.length > 0 && (
          <div className="px-4 py-2 flex-1 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">{t('modal.results')}</p>
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
            <p className="text-muted-foreground">{t('modal.noResults')}</p>
          </div>
        )}
      </div>
    );
  }

  // Emoji Screen
  if (screenView === 'emoji') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button onClick={() => setScreenView('main')} className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('modal.eventEmoji')}</h1>
          <div className="w-10" />
        </header>

        <div className="flex justify-center py-8">
          <div className={`w-24 h-24 rounded-full ${getColorClassName(color)} flex items-center justify-center`}>
            <span className="text-4xl">{emoji}</span>
          </div>
        </div>

        <div className="flex-1 px-4 overflow-y-auto pb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">{t('modal.emojis')}</p>
          <div className="grid grid-cols-8 gap-2">
            {EVENT_EMOJIS.map((e, idx) => (
              <button key={idx} onClick={() => { setEmoji(e); setScreenView('main'); }} className={`text-2xl p-2 rounded-lg transition-colors ${emoji === e ? 'bg-primary/20' : 'hover:bg-kairo-surface-2'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Repeat Screen removed - now using Bottom Sheet

  // Color Screen
  if (screenView === 'color') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        <header className="flex items-center justify-between px-4 py-4 safe-area-top">
          <button onClick={() => setScreenView('main')} className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('modal.eventColor')}</h1>
          <div className="w-10" />
        </header>

        <div className="flex justify-center py-8">
          <div className={`w-24 h-24 rounded-full ${getColorClassName(color)} flex items-center justify-center`}>
            <span className="text-4xl">{emoji}</span>
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
          <h1 className="text-lg font-semibold text-foreground">{t('modal.alerts')}</h1>
          <div className="w-10" />
        </header>

        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-3">{t('modal.swipeToDelete')}</p>
          
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
                  <span className="text-foreground">{t('modal.alerts').replace('s', '')} {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openAlertPicker(index)}
                      className="flex items-center gap-2 text-primary"
                    >
                      <span>{getAlertLabel(alert.time)}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
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
              <span>{t('modal.addAlert')}</span>
            </button>
          )}
          
          <p className="text-xs text-muted-foreground text-center mt-4">{t('modal.maxAlerts')}</p>
        </div>

        {/* Bottom Sheet para selecionar tempo do alerta */}
        <Sheet open={alertSheetOpen} onOpenChange={setAlertSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-3xl bg-kairo-surface-2 border-border/30">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-foreground text-center">{t('modal.whenAlert')}</SheetTitle>
            </SheetHeader>
            <div className="space-y-1 pb-8">
              {availableAlertOptions.map((opt) => {
                const isSelected = editingAlertIndex !== null && alerts[editingAlertIndex]?.time === opt.value;
                return (
                  <button 
                    key={opt.value}
                    onClick={() => selectAlertTime(opt.value)}
                    className="w-full px-4 py-4 flex items-center justify-between rounded-xl bg-kairo-surface-1/50 hover:bg-kairo-surface-3 transition-colors"
                  >
                    <span className="text-foreground font-medium">{opt.label}</span>
                    {isSelected && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Main Screen
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in overflow-hidden">
      <header className="flex items-center justify-between px-4 py-4 safe-area-top">
        <button onClick={onClose} className="text-foreground font-medium">{t('common.cancel')}</button>
        <h1 className="text-lg font-semibold text-foreground">
          {isExpired ? t('modal.completedEvent') : t('modal.editEvent')}
        </h1>
        {!isExpired ? (
          <button onClick={handleSave} disabled={isSaving} className="text-primary font-medium disabled:opacity-50 flex items-center gap-2">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('common.save')}
          </button>
        ) : (
          <div className="w-14" />
        )}
      </header>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-8">
        {/* Expired Banner */}
        {isExpired && (
          <div className="mx-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('modal.eventExpired')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('modal.eventExpiredDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Emoji Picker */}
        <div className="flex justify-center py-6">
          <button 
            onClick={() => !isExpired && setScreenView('emoji')} 
            disabled={isExpired}
            className={`w-24 h-24 rounded-full ${getColorClassName(color)} flex items-center justify-center shadow-lg transition-transform ${
              isExpired ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'
            }`}
          >
            <span className="text-4xl">{emoji}</span>
          </button>
        </div>

        {/* Title Card */}
        <div className={`mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder={t('modal.title')} 
            disabled={isExpired}
            className="w-full px-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed" 
          />
        </div>

        {/* All Day & Date/Time Card */}
        <div className={`mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>
          {/* All Day Toggle */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-border/10">
            <span className="text-foreground">{t('modal.allDay')}</span>
            <Switch checked={isAllDay} onCheckedChange={setIsAllDay} disabled={isExpired} />
          </div>

          {/* Date */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-border/10">
            <span className="text-foreground">{t('modal.date')}</span>
            {isExpired ? (
              <span className="text-muted-foreground">{format(eventDate, "dd/MM/yyyy", { locale: dateLocale })}</span>
            ) : (
              <DatePicker date={eventDate} onDateChange={setEventDate} />
            )}
          </div>

          {/* Time - only show if not all day */}
          {!isAllDay && (
            <div className="px-4 py-4 flex items-center justify-between border-b border-border/10">
              <span className="text-foreground">{t('modal.time')}</span>
              {isExpired ? (
                <span className="text-muted-foreground">{eventTime}</span>
              ) : (
                <TimePicker time={eventTime} onTimeChange={setEventTime} />
              )}
            </div>
          )}

          {/* Location */}
          <button 
            onClick={() => !isExpired && setScreenView('location')} 
            disabled={isExpired}
            className="w-full px-4 py-4 flex items-center justify-between gap-3 disabled:cursor-not-allowed"
          >
            <span className="text-foreground flex-shrink-0">{t('modal.location')}</span>
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
              <span className={`text-sm text-right truncate ${location ? 'text-foreground' : 'text-muted-foreground'}`}>
                {location || (isExpired ? t('modal.noLocation') : t('modal.addLocation'))}
              </span>
              {!isExpired && <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
            </div>
          </button>
        </div>

        {/* Repeat Card */}
        <div className={`mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>
          <button 
            onClick={() => !isExpired && setRepeatSheetOpen(true)} 
            disabled={isExpired}
            className="w-full px-4 py-4 flex items-center justify-between disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <Repeat className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('modal.repeat')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{getRepeatLabel(repeat)}</span>
              {!isExpired && <ChevronRight className="w-5 h-5" />}
            </div>
          </button>
        </div>

        {/* Color Card */}
        <div className={`mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>
          <button 
            onClick={() => !isExpired && setScreenView('color')} 
            disabled={isExpired}
            className="w-full px-4 py-4 flex items-center justify-between disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('modal.eventColor')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full ${getColorClassName(color)}`} />
              {!isExpired && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            </div>
          </button>
        </div>

        {/* Alerts Card - hidden for expired */}
        {!isExpired && (
          <div className="mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden">
            {/* Notification Toggle */}
            <button onClick={() => setNotificationEnabled(!notificationEnabled)} className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notificationEnabled ? 'bg-gradient-to-br from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3]' : 'bg-kairo-surface-3'}`}>
                  <Bell className={`w-5 h-5 ${notificationEnabled ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-left">
                  <span className="text-foreground">{t('modal.pushNotification')}</span>
                  <p className="text-xs text-muted-foreground">{t('modal.pushNotificationDesc')}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${notificationEnabled ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {notificationEnabled && <Check className="w-4 h-4 text-background" />}
              </div>
            </button>

            {/* Call Alert Toggle */}
            <button onClick={() => setCallAlertEnabled(!callAlertEnabled)} className="w-full px-4 py-4 flex items-center justify-between border-b border-border/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${callAlertEnabled ? 'bg-gradient-to-br from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3]' : 'bg-kairo-surface-3'}`}>
                  <Phone className={`w-5 h-5 ${callAlertEnabled ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-left">
                  <span className="text-foreground">{t('modal.callMeReminder')}</span>
                  <p className="text-xs text-muted-foreground">{t('modal.callMeReminderDesc')}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${callAlertEnabled ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {callAlertEnabled && <Check className="w-4 h-4 text-background" />}
              </div>
            </button>

            {/* Alerts List */}
            <button onClick={() => setScreenView('alerts')} className="w-full px-4 py-4 flex items-center justify-between">
              <span className="text-foreground">{t('modal.alerts')}</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{alerts.length} {alerts.length !== 1 ? t('modal.alertsCount').replace('{count} ', '') : t('modal.alertCount').replace('{count} ', '')}</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
          </div>
        )}

        {/* Notes Card */}
        <div className={`mx-4 mb-4 bg-kairo-surface-2 rounded-2xl overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder={t('modal.notes')} 
            rows={4} 
            disabled={isExpired}
            className="w-full px-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none disabled:cursor-not-allowed" 
          />
        </div>

        {/* Reactivate Button - only for expired events */}
        {isExpired && (
          <div className="mx-4 mb-4">
            <button 
              onClick={() => setShowReactivateSheet(true)}
              className="w-full bg-primary/10 text-primary rounded-2xl px-4 py-4 flex items-center justify-center gap-3 hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="font-medium">{t('modal.reactivate')}</span>
            </button>
          </div>
        )}

        {/* Delete Event Button */}
        <div className="mx-4 mb-8">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-destructive/10 text-destructive rounded-2xl px-4 py-4 flex items-center justify-center gap-3 hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">{t('modal.deleteEvent')}</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('modal.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('modal.deleteWarning').replace('{title}', title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEvent} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Sheet para reativar evento */}
      <Sheet open={showReactivateSheet} onOpenChange={setShowReactivateSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-kairo-surface-2 border-border/30">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-foreground text-center">{t('modal.reactivate')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-8">
            <p className="text-sm text-muted-foreground text-center">
              {t('modal.reactivateDesc')}
            </p>
            
            <button 
              onClick={handleReactivate}
              className="w-full px-4 py-4 flex items-center justify-center gap-3 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              {t('modal.chooseNewDate')}
            </button>
            
            <button 
              onClick={() => setShowReactivateSheet(false)}
              className="w-full px-4 py-4 flex items-center justify-center rounded-xl bg-kairo-surface-1/50 text-foreground"
            >
              {t('common.cancel')}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom Sheet para selecionar repetição */}
      <Sheet open={repeatSheetOpen} onOpenChange={setRepeatSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-kairo-surface-2 border-border/30">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-foreground text-center">{t('modal.repeat')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-1 pb-8">
            {REPEAT_OPTIONS.map((opt) => (
              <button 
                key={opt.value}
                onClick={() => { setRepeat(opt.value); setRepeatSheetOpen(false); }}
                className="w-full px-4 py-4 flex items-center justify-between rounded-xl bg-kairo-surface-1/50 hover:bg-kairo-surface-3 transition-colors"
              >
                <span className="text-foreground font-medium">{opt.label}</span>
                {repeat === opt.value && <Check className="w-5 h-5 text-primary" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EditEventModal;
