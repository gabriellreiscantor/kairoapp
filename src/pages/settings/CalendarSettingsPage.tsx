import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

const CALENDARS = [
  { id: 'kairo', name: 'Kairo', color: '#F97316', enabled: true },
  { id: 'google', name: 'Google Calendar', color: '#4285F4', enabled: false },
  { id: 'apple', name: 'Apple Calendar', color: '#FF3B30', enabled: false },
  { id: 'outlook', name: 'Outlook', color: '#0078D4', enabled: false },
];

const CalendarSettingsPage = () => {
  const navigate = useNavigate();
  const [calendars, setCalendars] = useState(CALENDARS);
  const [startOfWeek, setStartOfWeek] = useState<'sunday' | 'monday'>('sunday');
  const [showWeekNumbers, setShowWeekNumbers] = useState(false);

  const toggleCalendar = (id: string) => {
    setCalendars(prev => prev.map(cal => 
      cal.id === id ? { ...cal, enabled: !cal.enabled } : cal
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Calendários</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Connected Calendars */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Calendários Conectados
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            {calendars.map((calendar, index) => (
              <button
                key={calendar.id}
                onClick={() => toggleCalendar(calendar.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 ${
                  index < calendars.length - 1 ? 'border-b border-border/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="text-foreground">{calendar.name}</span>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  calendar.enabled ? 'bg-primary' : 'bg-kairo-surface-3'
                }`}>
                  {calendar.enabled && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Add Calendar */}
        <button className="w-full py-3.5 rounded-2xl border border-dashed border-border/40 text-center text-muted-foreground">
          + Adicionar Calendário
        </button>

        {/* Calendar Options */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Opções
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            {/* Start of Week */}
            <div className="px-4 py-3.5 border-b border-border/10">
              <p className="text-foreground mb-3">Início da Semana</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setStartOfWeek('sunday')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    startOfWeek === 'sunday' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-kairo-surface-3 text-muted-foreground'
                  }`}
                >
                  Domingo
                </button>
                <button
                  onClick={() => setStartOfWeek('monday')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    startOfWeek === 'monday' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-kairo-surface-3 text-muted-foreground'
                  }`}
                >
                  Segunda
                </button>
              </div>
            </div>

            {/* Show Week Numbers */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-foreground">Mostrar Número da Semana</span>
              <Switch checked={showWeekNumbers} onCheckedChange={setShowWeekNumbers} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSettingsPage;
