import { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import EventCard, { type Priority } from "@/components/EventCard";
import CreateEventModal from "@/components/CreateEventModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  time: string;
  date: string;
  priority: Priority;
}

const HomePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([
    {
      id: "1",
      title: "Reunião com equipe",
      time: "09:00",
      date: "2024-01-15",
      priority: "high",
    },
    {
      id: "2",
      title: "Almoço de negócios",
      time: "12:30",
      date: "2024-01-15",
      priority: "medium",
    },
    {
      id: "3",
      title: "Revisão de projeto",
      time: "15:00",
      date: "2024-01-15",
      priority: "low",
    },
    {
      id: "4",
      title: "Academia",
      time: "19:00",
      date: "2024-01-15",
      priority: "medium",
    },
  ]);

  const today = new Date();
  const formattedDate = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });

  const handleCreateEvent = (eventData: {
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
  }) => {
    const newEvent: Event = {
      id: Date.now().toString(),
      title: eventData.title,
      time: eventData.time || "00:00",
      date: eventData.date || format(today, "yyyy-MM-dd"),
      priority: (eventData.priority as Priority) || "medium",
    };
    setEvents([...events, newEvent]);
  };

  const todayEvents = events.filter((e) => {
    // For demo, show all events as today
    return true;
  });

  const upcomingEvents = events.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <p className="text-muted-foreground capitalize">{formattedDate}</p>
        <h1 className="text-3xl font-bold text-foreground mt-1">Hoje</h1>
      </header>

      {/* Today's Events */}
      <section className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {todayEvents.length} eventos hoje
          </h2>
        </div>

        <div className="space-y-3">
          {todayEvents.map((event, index) => (
            <div
              key={event.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <EventCard
                id={event.id}
                title={event.title}
                time={event.time}
                priority={event.priority}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="px-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Próximos</h2>
            <button className="text-primary text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity">
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <div
                key={event.id}
                className="animate-fade-up opacity-70"
                style={{ animationDelay: `${(todayEvents.length + index) * 100}ms` }}
              >
                <EventCard
                  id={event.id}
                  title={event.title}
                  time={event.time}
                  priority={event.priority}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-kairo-surface2 flex items-center justify-center mb-6">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Nenhum evento
          </h3>
          <p className="text-muted-foreground max-w-xs">
            Adicione seu primeiro evento ou envie uma mensagem no WhatsApp
          </p>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed right-6 bottom-24 w-14 h-14 bg-primary text-primary-foreground 
                   rounded-full shadow-lg flex items-center justify-center
                   transition-all duration-200 hover:scale-105 active:scale-95
                   hover:shadow-xl hover:shadow-primary/25"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateEvent}
      />
    </div>
  );
};

export default HomePage;
