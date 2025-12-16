import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Settings } from "lucide-react";
import BottomNavPill from "@/components/BottomNavPill";
import CalendarView from "@/components/CalendarView";
import DayListView from "@/components/DayListView";
import ChatInterface from "@/components/ChatInterface";
import SettingsDrawer from "@/components/SettingsDrawer";
import CreateEventModal from "@/components/CreateEventModal";
import EventCard from "@/components/EventCard";

interface Event {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  description?: string;
}

const MainApp = () => {
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isChatOpen, setIsChatOpen] = useState(false);
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

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm capitalize">
            {format(new Date(), 'EEEE', { locale: ptBR })}
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
          </h1>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center transition-colors hover:bg-kairo-surface-3"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
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
        <div className="px-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </h2>
            <button 
              onClick={() => handleAddEvent()}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-transform active:scale-95"
            >
              <Plus className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
          
          {todayEvents.length > 0 ? (
            <div className="space-y-3">
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
              className="w-full p-6 rounded-2xl border-2 border-dashed border-border/50 text-center"
            >
              <p className="text-muted-foreground text-sm">Sem planos ainda. Toque para adicionar!</p>
            </button>
          )}
        </div>
      )}

      {/* FAB for list view */}
      {activeView === 'list' && (
        <button 
          onClick={() => handleAddEvent()}
          className="fixed right-6 bottom-28 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-95 z-40"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </button>
      )}

      {/* Bottom Navigation */}
      <BottomNavPill
        activeView={activeView}
        onViewChange={setActiveView}
        onChatOpen={() => setIsChatOpen(true)}
      />

      {/* Chat Interface */}
      <ChatInterface
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
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
