import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import CalendarView from "@/components/CalendarView";
import DayListView from "@/components/DayListView";
import SettingsDrawer from "@/components/SettingsDrawer";
import CreateEventModal from "@/components/CreateEventModal";
import ChatPage from "@/components/ChatPage";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  description?: string;
}

const MainApp = () => {
  const [activeView, setActiveView] = useState<'chat' | 'list' | 'calendar'>('chat');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | null>(null);

  // Sample events
  const [events] = useState<Record<string, Event[]>>({
    [format(new Date(), 'yyyy-MM-dd')]: [
      { id: '1', title: 'Reunião de equipe', time: '09:00', priority: 'high' },
      { id: '2', title: 'Almoço com cliente', time: '12:30', priority: 'medium' },
    ],
  });

  

  const handleAddEvent = (date?: Date) => {
    setCreateEventDate(date || selectedDate);
    setIsCreateModalOpen(true);
  };

  // Chat Page (Home)
  if (activeView === 'chat') {
    return (
      <>
        <ChatPage 
          onNavigateToCalendar={() => setActiveView('list')}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </>
    );
  }

  // Calendar/List Views
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header - Toki style */}
      <header className="px-4 safe-area-top pb-2 flex items-center justify-between">
        <button className="flex items-center gap-1">
          <h1 className="text-2xl font-bold text-foreground capitalize">
            {format(currentMonth, 'MMMM', { locale: ptBR })}
          </h1>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <div className="flex items-center gap-1.5 bg-kairo-surface-2 rounded-lg px-2.5 py-1.5">
          <span className="text-foreground font-bold text-sm tabular-nums">
            {format(new Date(), 'd')}
          </span>
        </div>
      </header>

      {/* Main Content */}
      {activeView === 'calendar' ? (
        <CalendarView 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      ) : (
        <DayListView
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onAddEvent={handleAddEvent}
          events={events}
        />
      )}

      {/* FAB for list view */}
      {activeView === 'list' && (
        <button 
          onClick={() => handleAddEvent()}
          className="fixed right-4 bottom-24 w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25 transition-transform active:scale-95 z-40"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-4 left-0 right-0 px-4 safe-area-bottom z-50">
        <div className="flex items-center justify-between">
          {/* View Toggle Pill - List and Calendar only */}
          <div className="bg-kairo-surface-2/90 backdrop-blur-sm rounded-full p-1 flex items-center gap-0.5">
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-2 rounded-full transition-all duration-150 ${
                activeView === 'list' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="8" height="8" rx="1.5" />
                <rect x="13" y="3" width="8" height="8" rx="1.5" />
                <rect x="3" y="13" width="8" height="8" rx="1.5" />
                <rect x="13" y="13" width="8" height="8" rx="1.5" />
              </svg>
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`px-3 py-2 rounded-full transition-all duration-150 ${
                activeView === 'calendar' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Button */}
          <button
            onClick={() => setActiveView('chat')}
            className="w-11 h-11 rounded-full bg-kairo-surface-2/90 backdrop-blur-sm border border-border/20 flex items-center justify-center transition-all duration-150 active:scale-95"
          >
            <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.936 1.444 5.544 3.683 7.227L4.5 22l4.414-2.069c.94.262 1.94.41 2.986.41C17.523 19.341 22 15.196 22 11.243S17.523 2 12 2zm0 15.341c-.87 0-1.71-.122-2.5-.35l-.45-.13-2.5 1.17.6-2.21-.35-.3C5.42 14.38 4 12.91 4 11.243 4 7.353 7.582 4 12 4s8 3.353 8 7.243-3.582 7.098-8 7.098z"/>
            </svg>
          </button>
        </div>
      </div>

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
