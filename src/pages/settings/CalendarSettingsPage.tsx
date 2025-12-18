import { ChevronRight, Check, RefreshCw, Calendar, Settings, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import kairoLogo from "@/assets/kairo-logo.png";
import BackButton from "@/components/BackButton";

const CalendarSettingsPage = () => {
  const [showAddSheet, setShowAddSheet] = useState(false);

  const calendars = [
    { id: 'example', name: 'Exemplo de cronograma', color: '#EF4444', checked: true },
    { id: 'kairo', name: 'Kairo', color: '#F97316', checked: true, isDefault: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">Calendários</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Default Calendar Card */}
        <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/10">
            <p className="text-muted-foreground text-sm">Calendário Padrão</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={kairoLogo} alt="Kairo" className="w-7 h-7 rounded-lg" />
              <span className="text-foreground">Kairo</span>
            </div>
            <button className="flex items-center gap-1 text-muted-foreground">
              <span className="text-sm">Padrão</span>
              <ChevronsUpDown className="w-4 h-4" />
            </button>
          </div>
          <div className="px-4 pb-4">
            <p className="text-muted-foreground text-sm">
              Todos os eventos que você criar no Kairo serão adicionados ao Calendário Padrão.
              <button className="text-foreground underline ml-1">Está com problema de sincronização?</button>
            </p>
          </div>
        </div>

        {/* Kairo Calendars Section */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs text-muted-foreground uppercase tracking-wider">Kairo</h2>
            <button className="text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            {calendars.map((calendar, index) => (
              <button
                key={calendar.id}
                className={`w-full flex items-center justify-between px-4 py-3.5 ${
                  index < calendars.length - 1 ? 'border-b border-border/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: calendar.color }}
                  >
                    {calendar.checked && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-foreground">{calendar.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {calendar.isDefault && (
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs">
                      Padrão
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Add Calendar Button */}
        <button 
          onClick={() => setShowAddSheet(true)}
          className="w-full py-4 rounded-2xl bg-[#E8E4D9] text-background font-medium flex items-center justify-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          <span>Adicionar calendário</span>
        </button>

        {/* Calendar Accounts Link */}
        <button className="w-full flex items-center justify-center gap-2 text-muted-foreground py-2">
          <Settings className="w-5 h-5" />
          <span>Contas do Calendário</span>
        </button>
      </div>

      {/* Add Account Sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 z-50" onClick={() => setShowAddSheet(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-kairo-surface-1 rounded-t-3xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-1">
              <button className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-kairo-surface-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-xs font-bold text-blue-600">31</div>
                  <span className="text-foreground">Calendário do Google</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-kairo-surface-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded" />
                  <span className="text-foreground">Calendário do iCloud</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-kairo-surface-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">O</span>
                  </div>
                  <span className="text-foreground">Calendário do Outlook</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-kairo-surface-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-[8px] text-white font-bold">CalDAV</div>
                  <span className="text-foreground">Conta CalDAV</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="h-8 safe-area-bottom" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarSettingsPage;
