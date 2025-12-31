import { ChevronRight, Check, RefreshCw, Calendar, Settings, ChevronsUpDown, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import kairoLogo from "@/assets/kairo-logo.png";
import BackButton from "@/components/BackButton";

const CalendarSettingsPage = () => {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const calendars = [
    { id: 'example', name: 'Exemplo de cronograma', color: '#EF4444', checked: true },
    { id: 'horah', name: 'Horah', color: '#F97316', checked: true, isDefault: true },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Premium gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 py-4 safe-area-top flex items-center gap-3 border-b border-border/5">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Calendários</h1>
          <p className="text-xs text-muted-foreground">Gerencie seus calendários</p>
        </div>
      </header>

      <div className="relative px-4 pb-8 space-y-6 pt-4">
        {/* Default Calendar Card - Premium */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-kairo-surface-2 to-kairo-surface-2/80 border border-border/10 shadow-xl shadow-black/5"
        >
          {/* Subtle glow effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="px-4 py-3 border-b border-border/10 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
              <p className="text-muted-foreground text-sm font-medium">Calendário Padrão</p>
            </div>
            
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md" />
                  <img src={kairoLogo} alt="Horah" className="relative w-10 h-10 rounded-xl shadow-lg" />
                </div>
                <div>
                  <span className="text-foreground font-semibold">Horah</span>
                  <p className="text-xs text-muted-foreground">Calendário principal</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                <span>Padrão</span>
                <ChevronsUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="px-4 pb-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Todos os eventos criados serão adicionados aqui.
                <button className="text-primary hover:text-primary/80 ml-1 font-medium transition-colors">
                  Problemas de sincronização?
                </button>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Horah Calendars Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Meus Calendários</h2>
            <button 
              onClick={handleRefresh}
              className="p-2 rounded-full hover:bg-kairo-surface-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="bg-kairo-surface-2/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/10 shadow-lg shadow-black/5">
            {calendars.map((calendar, index) => (
              <motion.button
                key={calendar.id}
                whileHover={{ backgroundColor: 'hsl(var(--kairo-surface-3) / 0.5)' }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${
                  index < calendars.length - 1 ? 'border-b border-border/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                    style={{ 
                      backgroundColor: calendar.color,
                      boxShadow: `0 4px 12px ${calendar.color}40`
                    }}
                  >
                    {calendar.checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                  <div className="text-left">
                    <span className="text-foreground font-medium">{calendar.name}</span>
                    <p className="text-xs text-muted-foreground">2 eventos esta semana</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {calendar.isDefault && (
                    <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                      Padrão
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Add Calendar Button - Premium */}
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddSheet(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold flex items-center justify-center gap-2.5 shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-shadow"
        >
          <Plus className="w-5 h-5" />
          <span>Adicionar Calendário</span>
        </motion.button>

        {/* Calendar Accounts Link */}
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full flex items-center justify-center gap-2 text-muted-foreground py-3 hover:text-foreground transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm">Gerenciar Contas</span>
        </motion.button>
      </div>

      {/* Add Account Sheet - Premium */}
      <AnimatePresence>
        {showAddSheet && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50" 
            onClick={() => setShowAddSheet(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-kairo-surface-1 rounded-t-3xl border-t border-border/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-border/30 rounded-full" />
              </div>
              
              <div className="px-4 pb-2">
                <h3 className="text-lg font-semibold text-foreground">Conectar Calendário</h3>
                <p className="text-sm text-muted-foreground">Escolha um provedor para sincronizar</p>
              </div>
              
              <div className="p-4 space-y-2">
                {[
                  { icon: <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-md"><span className="text-sm font-bold text-red-500">G</span></div>, name: 'Google Calendar', desc: 'Sincronize com sua conta Google' },
                  { icon: <div className="w-7 h-7 bg-gradient-to-br from-sky-400 to-blue-600 rounded-lg shadow-md" />, name: 'iCloud Calendar', desc: 'Conecte com Apple iCloud' },
                  { icon: <div className="w-7 h-7 bg-[#0078D4] rounded-lg flex items-center justify-center shadow-md"><span className="text-white text-sm font-bold">O</span></div>, name: 'Outlook Calendar', desc: 'Microsoft 365 e Outlook' },
                  { icon: <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-md"><Calendar className="w-4 h-4 text-white" /></div>, name: 'CalDAV', desc: 'Outros calendários compatíveis' },
                ].map((item, index) => (
                  <motion.button 
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01, backgroundColor: 'hsl(var(--kairo-surface-3) / 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-kairo-surface-2/60 border border-border/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <div className="text-left">
                        <span className="text-foreground font-medium">{item.name}</span>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
              <div className="h-8 safe-area-bottom" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarSettingsPage;
