import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Calendar as CalendarIcon, ChevronUp, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CalendarView from "@/components/CalendarView";
import DayListView from "@/components/DayListView";
import SettingsDrawer from "@/components/SettingsDrawer";
import CreateEventModal from "@/components/CreateEventModal";
import EditEventModal from "@/components/EditEventModal";
import EventDetailPage from "@/components/EventDetailPage";
import ChatPage from "@/components/ChatPage";
import CallScreen from "@/components/CallScreen";
import { useCallAlert } from "@/hooks/useCallAlert";
import { useCallKit } from "@/contexts/CallKitContext";
import { requestNotificationPermissions } from "@/hooks/useCallAlertScheduler";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";
import horahLogo from "@/assets/horah-logo.png";
import horahLogoDark from "@/assets/horah-logo-dark.png";
import { useTheme } from "next-themes";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  description?: string;
  location?: string;
  isAllDay?: boolean;
  emoji?: string;
}

type ViewType = 'chat' | 'list' | 'calendar';

const MainApp = () => {
  const { t, getDateLocale, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const dateLocale = getDateLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const settingsParamProcessed = useRef(false);
  
  
  // Check if settings should be open from URL param
  const shouldOpenSettings = searchParams.get('settings') === 'open';
  
  // Call alert hook for "Me Ligue" feature
  const { 
    isCallVisible, 
    currentEvent, 
    showCall, 
    handleAnswer, 
    handleDecline, 
    handleSnooze,
    isPlaying 
  } = useCallAlert();
  
  // CallKit context for VoIP (iOS native only) - agora roda no app start
  const { registerVoIPToken } = useCallKit();

  // Push notifications hook - registers FCM token on native platforms
  usePushNotifications({
    onNotificationReceived: (notification) => {
      console.log('[MainApp] Push received:', notification);
      // Handle call alert push notifications
      if (notification.data?.type === 'call-alert') {
        showCall({
          id: notification.data.eventId,
          title: notification.data.eventTitle,
          emoji: notification.data.eventEmoji || '📅',
          time: notification.data.eventTime,
          location: notification.data.eventLocation,
        }, language);
      }
    },
    onNotificationAction: (action) => {
      console.log('[MainApp] Push action:', action);
      if (action.notification.data?.type === 'call-alert') {
        showCall({
          id: action.notification.data.eventId,
          title: action.notification.data.eventTitle,
          emoji: action.notification.data.eventEmoji || '📅',
          time: action.notification.data.eventTime,
          location: action.notification.data.eventLocation,
        }, language);
      }
    }
  });
  
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Sync settings open state with URL param - using ref to prevent re-executions
  useEffect(() => {
    if (shouldOpenSettings && !settingsParamProcessed.current) {
      settingsParamProcessed.current = true;
      // Clear param FIRST, then open
      setSearchParams({}, { replace: true });
      setIsSettingsOpen(true);
    }
    
    // Reset flag when param is cleared
    if (!shouldOpenSettings) {
      settingsParamProcessed.current = false;
    }
  }, [shouldOpenSettings, setSearchParams]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  
  // Initial edit message from EventDetailPage to ChatPage
  const [initialEditMessage, setInitialEditMessage] = useState<{ eventId: string; message: string } | null>(null);

  // Real events from database
  const [events, setEvents] = useState<Record<string, Event[]>>({});
  const [eventsVersion, setEventsVersion] = useState(0);

  // Fetch events from Supabase
  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) throw error;

      // Group events by date
      const grouped: Record<string, Event[]> = {};
      data?.forEach((e) => {
        const dateKey = e.event_date;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          id: e.id,
          title: e.title,
          time: e.event_time || '',
          priority: e.priority as 'high' | 'medium' | 'low',
          description: e.description || undefined,
          location: e.location || undefined,
          isAllDay: !e.event_time,
          emoji: getCategoryEmoji(e.category),
        });
      });

      setEvents(grouped);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [user]);

  // Get emoji for category
  const getCategoryEmoji = (category: string | null): string => {
    const emojiMap: Record<string, string> = {
      trabalho: '💼',
      saúde: '🏥',
      pessoal: '👤',
      lazer: '🎮',
      estudo: '📚',
      exercício: '🏃',
      reunião: '📋',
      geral: '📅',
    };
    return emojiMap[category || 'geral'] || '📅';
  };

  // Fetch events on mount and when user changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, eventsVersion]);

  // Request notification permissions and set up listeners for "Me Ligue"
  useEffect(() => {
    // Request permissions on mount
    requestNotificationPermissions();

    // Set up native notification listener
    if (Capacitor.isNativePlatform()) {
      const setupNotificationListeners = async () => {
        // Listen for notification received (when app is in foreground)
        await LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('[MainApp] Notification received:', notification);
          
          if (notification.extra?.type === 'call-alert') {
            showCall({
              id: notification.extra.eventId,
              title: notification.extra.eventTitle,
              emoji: notification.extra.eventEmoji || '📅',
              time: notification.extra.eventTime,
              location: notification.extra.eventLocation,
            }, language);
          }
        });

        // Listen for notification action performed (when user taps notification)
        await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          console.log('[MainApp] Notification action:', action);
          
          if (action.notification.extra?.type === 'call-alert') {
            showCall({
              id: action.notification.extra.eventId,
              title: action.notification.extra.eventTitle,
              emoji: action.notification.extra.eventEmoji || '📅',
              time: action.notification.extra.eventTime,
              location: action.notification.extra.eventLocation,
            }, language);
          }
        });
      };

      setupNotificationListeners();
    }

    // Web fallback listener
    const handleWebCallAlert = (event: CustomEvent) => {
      const { event: eventData } = event.detail;
      showCall({
        id: eventData.id,
        title: eventData.title,
        emoji: eventData.emoji || '📅',
        time: eventData.event_time,
        location: eventData.location,
      }, language);
    };

    window.addEventListener('kairo-call-alert', handleWebCallAlert as EventListener);

    return () => {
      window.removeEventListener('kairo-call-alert', handleWebCallAlert as EventListener);
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.removeAllListeners();
      }
    };
  }, [showCall, language]);

  // Callback when event is created via chat
  const handleEventCreated = useCallback(() => {
    setEventsVersion(v => v + 1);
  }, []);

  // Generate months using date-fns with current locale
  const getMonths = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2024, i, 1);
      return format(date, 'MMM', { locale: dateLocale }).toLowerCase();
    });
  };

  const handleAddEvent = (date?: Date) => {
    setCreateEventDate(date || selectedDate);
    setIsCreateModalOpen(true);
  };
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsDateSheetOpen(true);
  };

  const getEventsForDate = (date: Date) => {
    return events[format(date, 'yyyy-MM-dd')] || [];
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(new Date(pickerYear, monthIndex, 1));
    setShowMonthPicker(false);
  };

  // Floating Dock Component
  const FloatingDock = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 safe-area-bottom">
      <div className="floating-dock flex items-center gap-2 px-3 py-2">
        {/* List View */}
        <button
          onClick={() => setActiveView('list')}
          className={`dock-item w-11 h-11 rounded-full ${activeView === 'list' ? 'active' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
        
        {/* Center - Chat/Kairo Button */}
        <button
          onClick={() => setActiveView('chat')}
          onTouchEnd={(e) => {
            e.stopPropagation();
            setActiveView('chat');
          }}
          className="w-14 h-14 rounded-full overflow-hidden mx-1 shadow-lg shadow-primary/30 border-2 border-primary/30 active:scale-95 transition-transform"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <img 
            src={resolvedTheme === 'dark' ? horahLogoDark : horahLogo} 
            alt="Horah" 
            className="w-full h-full object-cover"
            draggable={false}
            style={{ pointerEvents: 'none' }}
          />
        </button>
        
        {/* Calendar View */}
        <button
          onClick={() => setActiveView('calendar')}
          className={`dock-item w-11 h-11 rounded-full ${activeView === 'calendar' ? 'active' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <CalendarIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // Chat Page (Home)
  if (activeView === 'chat') {
    return (
      <>
        {/* Call Screen for "Me Ligue" */}
        <CallScreen
          isVisible={isCallVisible}
          eventTitle={currentEvent?.title || ''}
          eventTime={currentEvent?.time}
          eventEmoji={currentEvent?.emoji}
          onAnswer={handleAnswer}
          onDecline={handleDecline}
          onSnooze={handleSnooze}
        />
        
        <div className="h-screen">
          <ChatPage 
            onNavigateToCalendar={() => setActiveView('list')}
            onOpenSettings={() => setIsSettingsOpen(true)}
            activeView={activeView}
            onViewChange={setActiveView}
            onEventCreated={handleEventCreated}
            initialEditMessage={initialEditMessage}
            onClearInitialEditMessage={() => setInitialEditMessage(null)}
          />
          
          {/* Botão de teste VoIP temporário */}
          <button
            onClick={async () => {
              if (!user) {
                toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
                return;
              }
              
              toast({ title: 'Enviando VoIP push...', description: 'Aguarde a chamada nativa' });
              
              try {
                const { data, error } = await supabase.functions.invoke('send-voip-push', {
                  body: {
                    user_id: user.id,
                    event_id: 'test-' + Date.now(),
                    event_title: 'Teste VoIP',
                    event_time: format(new Date(), 'HH:mm'),
                  },
                });
                
                if (error) {
                  console.error('[Test VoIP] Error:', error);
                  toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                } else {
                  console.log('[Test VoIP] Success:', data);
                  toast({ title: 'VoIP enviado!', description: 'A chamada deve aparecer em segundos' });
                }
              } catch (err) {
                console.error('[Test VoIP] Exception:', err);
                toast({ title: 'Erro', description: 'Falha ao enviar', variant: 'destructive' });
              }
            }}
            className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-green-500 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            📞
          </button>
          
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </div>
      </>
    );
  }

  const months = getMonths();

  // Calendar/List Views
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Gradient Overlay Top */}
      <div className="fixed top-0 left-0 right-0 h-24 gradient-overlay-top pointer-events-none z-30" />
      
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl px-5 safe-area-top pb-3 flex items-center justify-between">
        <button 
          onClick={() => {
            setPickerYear(currentMonth.getFullYear());
            setShowMonthPicker(!showMonthPicker);
          }}
          className="flex items-center gap-1.5"
        >
          <h1 className="text-2xl font-bold text-foreground capitalize tracking-tight">
            {format(currentMonth, 'MMMM', { locale: dateLocale })}
          </h1>
          <ChevronUp className={`w-5 h-5 text-primary transition-transform duration-300 ${showMonthPicker ? '' : 'rotate-180'}`} />
        </button>
        
        {/* Today indicator */}
        <div className="flex items-center gap-2 glass border border-primary/20 rounded-xl px-3 py-2">
          <span className="text-muted-foreground text-xs italic font-light tracking-wide">
            {t('calendar.todayIs')}
          </span>
          <span className="text-primary font-bold text-lg calendar-number">
            {format(new Date(), 'd')}
          </span>
        </div>
      </header>

      {/* Month Picker Popup */}
      {showMonthPicker && (
        <div className="fixed top-20 left-5 z-50 glass border border-border/20 rounded-2xl p-4 shadow-2xl w-[280px] safe-area-top mt-2">
          {/* Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setPickerYear(prev => prev - 1)}
              className="p-2 rounded-xl hover:bg-kairo-surface-3 transition-colors duration-300"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="text-foreground font-bold text-lg">{pickerYear}</span>
            <button 
              onClick={() => setPickerYear(prev => prev + 1)}
              className="p-2 rounded-xl hover:bg-kairo-surface-3 transition-colors duration-300"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => {
              const isCurrentMonth = currentMonth.getMonth() === index && currentMonth.getFullYear() === pickerYear;
              return (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(index)}
                  className={`py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isCurrentMonth 
                      ? 'gradient-gold text-primary-foreground shadow-lg shadow-primary/20' 
                      : 'text-foreground hover:bg-kairo-surface-3'
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Click outside to close month picker */}
      {showMonthPicker && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMonthPicker(false)} 
        />
      )}

      {/* Main Content */}
      <div className="flex-1 pt-20 pb-28 overflow-hidden bg-background">
        {activeView === 'calendar' ? (
          <CalendarView 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            events={events}
          />
        ) : (
          <DayListView
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onAddEvent={handleAddEvent}
            events={events}
          />
        )}
      </div>

      {/* Gradient Overlay Bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-32 gradient-overlay-bottom pointer-events-none z-10" />


      {/* Floating Dock Navigation */}
      <FloatingDock />

      {/* Event Detail Page */}
      <EventDetailPage
        isOpen={isDateSheetOpen}
        onClose={() => setIsDateSheetOpen(false)}
        selectedDate={selectedDate}
        events={getEventsForDate(selectedDate)}
        onAddEvent={() => {
          setIsDateSheetOpen(false);
          handleAddEvent(selectedDate);
        }}
        onDeleteEvent={async (eventId) => {
          try {
            await supabase.from('events').delete().eq('id', eventId);
            setEventsVersion(v => v + 1);
          } catch (error) {
            console.error('Error deleting event:', error);
          }
        }}
        onEditEvent={async (eventId) => {
          // Fetch full event data to edit
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();
          
          if (!error && data) {
            setEditingEvent(data);
            setIsEditModalOpen(true);
          }
        }}
        onNavigateToChat={(eventId, message) => {
          setInitialEditMessage({ eventId, message });
          setIsDateSheetOpen(false);
          setActiveView('chat');
        }}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={(event) => {
          console.log('Event saved:', event);
          setIsCreateModalOpen(false);
        }}
      />

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          onSave={() => {
            setEventsVersion(v => v + 1);
            setIsDateSheetOpen(false);
          }}
          onDelete={() => {
            setEventsVersion(v => v + 1);
            setIsDateSheetOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default MainApp;
