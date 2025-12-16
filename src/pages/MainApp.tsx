import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Calendar as CalendarIcon, ChevronUp, ChevronLeft, ChevronRight, LayoutGrid, MessageCircle } from "lucide-react";
import CalendarView from "@/components/CalendarView";
import DayListView from "@/components/DayListView";
import SettingsDrawer from "@/components/SettingsDrawer";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetailPage from "@/components/EventDetailPage";
import ChatPage from "@/components/ChatPage";
import FoxIcon from "@/components/icons/FoxIcon";

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
const VIEW_ORDER: ViewType[] = ['chat', 'list', 'calendar'];
const SWIPE_THRESHOLD = 50;
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

const MainApp = () => {
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  
  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Sample events
  const [events] = useState<Record<string, Event[]>>({
    [format(new Date(), 'yyyy-MM-dd')]: [
      { 
        id: '1', 
        title: 'Teste', 
        time: '09:00', 
        priority: 'high',
        location: 'Rua Razao e Lealdade, Cuiabá, MT, Brasil',
        isAllDay: true,
        emoji: '📅'
      },
    ],
  });

  const handleAddEvent = (date?: Date) => {
    setCreateEventDate(date || selectedDate);
    setIsCreateModalOpen(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const dateEvents = events[format(date, 'yyyy-MM-dd')] || [];
    if (dateEvents.length > 0) {
      setIsDateSheetOpen(true);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events[format(date, 'yyyy-MM-dd')] || [];
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(new Date(pickerYear, monthIndex, 1));
    setShowMonthPicker(false);
  };

  // Swipe navigation handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    
    const currentIndex = VIEW_ORDER.indexOf(activeView);
    
    if (swipeX > SWIPE_THRESHOLD && currentIndex > 0) {
      setActiveView(VIEW_ORDER[currentIndex - 1]);
    } else if (swipeX < -SWIPE_THRESHOLD && currentIndex < VIEW_ORDER.length - 1) {
      setActiveView(VIEW_ORDER[currentIndex + 1]);
    }
    
    setSwipeX(0);
    setIsSwiping(false);
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
          className="dock-item-center mx-1"
        >
          {activeView === 'chat' ? (
            <FoxIcon size={24} className="text-primary-foreground" />
          ) : (
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
          )}
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
      <div
        className="h-screen"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: isSwiping ? `translateX(${swipeX * 0.3}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        <ChatPage 
          onNavigateToCalendar={() => setActiveView('list')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          activeView={activeView}
          onViewChange={setActiveView}
        />
        
        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    );
  }

  // Calendar/List Views
  return (
    <div 
      className="h-screen bg-background flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        transform: isSwiping ? `translateX(${swipeX * 0.3}px)` : undefined,
        transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
      }}
    >
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
            {format(currentMonth, 'MMMM', { locale: ptBR })}
          </h1>
          <ChevronUp className={`w-5 h-5 text-primary transition-transform duration-300 ${showMonthPicker ? '' : 'rotate-180'}`} />
        </button>
        
        {/* Today indicator */}
        <div className="flex items-center gap-2 glass border border-primary/20 rounded-xl px-3 py-2">
          <span className="text-primary font-bold text-sm calendar-number">
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
            {MONTHS.map((month, index) => {
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
      <div className="flex-1 pt-20 pb-28 overflow-hidden">
        {activeView === 'calendar' ? (
          <CalendarView 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        ) : (
          <div className="h-full overflow-y-auto hide-scrollbar">
            <DayListView
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onAddEvent={handleAddEvent}
              events={events}
            />
          </div>
        )}
      </div>

      {/* Gradient Overlay Bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-32 gradient-overlay-bottom pointer-events-none z-10" />

      {/* FAB for list view */}
      {activeView === 'list' && (
        <button 
          onClick={() => handleAddEvent()}
          className="fixed right-5 bottom-28 w-14 h-14 rounded-full gradient-gold flex items-center justify-center shadow-2xl shadow-primary/40 transition-all duration-300 active:scale-95 z-40 golden-ripple"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </button>
      )}

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
    </div>
  );
};

export default MainApp;