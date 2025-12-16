import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Settings, Calendar as CalendarIcon, User } from "lucide-react";
import CalendarView from "@/components/CalendarView";
import DayListView from "@/components/DayListView";
import SettingsDrawer from "@/components/SettingsDrawer";
import CreateEventModal from "@/components/CreateEventModal";
import EventCard from "@/components/EventCard";
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

  const todayEvents = events[format(selectedDate, 'yyyy-MM-dd')] || [];

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
      {/* Header */}
      <header className="px-4 pt-10 pb-2 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs capitalize">
            {format(new Date(), 'EEEE', { locale: ptBR })}
          </p>
          <h1 className="text-lg font-semibold text-foreground">
            {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
          </h1>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-8 h-8 rounded-full bg-kairo-surface-2 flex items-center justify-center transition-colors hover:bg-kairo-surface-3"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      {/* Main Content */}
      {activeView === 'calendar' ? (
        <CalendarView 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      ) : (
        <DayListView
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onAddEvent={handleAddEvent}
          events={events}
        />
      )}

      {/* Events for selected date (when in calendar view) */}
      {activeView === 'calendar' && (
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-foreground">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </h2>
            <button 
              onClick={() => handleAddEvent()}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          
          {todayEvents.length > 0 ? (
            <div className="space-y-1.5">
              {todayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  time={event.time}
                  priority={event.priority}
                />
              ))}
            </div>
          ) : (
            <button 
              onClick={() => handleAddEvent()}
              className="w-full py-4 rounded-xl border border-dashed border-border/40 text-center"
            >
              <p className="text-muted-foreground text-xs">Sem planos. Toque para adicionar</p>
            </button>
          )}
        </div>
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
          {/* View Toggle Pill */}
          <div className="bg-kairo-surface-2/90 backdrop-blur-sm rounded-full p-1 flex items-center gap-0.5">
            <button
              onClick={() => setActiveView('chat')}
              className="px-3 py-2 rounded-full text-muted-foreground"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-2 rounded-full transition-all duration-150 ${
                activeView === 'list' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
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

          {/* Profile Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-11 h-11 rounded-full bg-kairo-surface-2/90 backdrop-blur-sm border border-border/20 flex items-center justify-center transition-all duration-150 active:scale-95"
          >
            <User className="w-5 h-5 text-foreground" />
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
