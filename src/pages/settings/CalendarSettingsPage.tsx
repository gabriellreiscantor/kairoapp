import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Pencil, RefreshCw, Sparkles, Calendar } from "lucide-react";
import horahLogo from "@/assets/horah-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendars, CALENDAR_COLORS } from "@/hooks/useCalendars";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
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

const CalendarSettingsPage = () => {
  const navigate = useNavigate();

  const {
    calendars,
    defaultCalendar,
    horahCalendars,
    usedHorahCalendars,
    maxHorahCalendars,
    canCreateHorahCalendar,
    loading,
    createCalendar,
    updateCalendar,
    setDefaultCalendar,
    deleteCalendar,
    refetch,
  } = useCalendars();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDefaultPicker, setShowDefaultPicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarColor, setNewCalendarColor] = useState(CALENDAR_COLORS[0]);

  const [editingCalendar, setEditingCalendar] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);

  const [calendarToDelete, setCalendarToDelete] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) return;
    const result = await createCalendar(newCalendarName, newCalendarColor);
    if (result) {
      setShowCreateModal(false);
      setNewCalendarName("");
      setNewCalendarColor(CALENDAR_COLORS[0]);
    }
  };

  const handleEditCalendar = async () => {
    if (!editingCalendar || !editingCalendar.name.trim()) return;
    const result = await updateCalendar(editingCalendar.id, {
      name: editingCalendar.name,
      color: editingCalendar.color,
    });
    if (result) {
      setShowEditModal(false);
      setEditingCalendar(null);
    }
  };

  const handleDeleteCalendar = async () => {
    if (!calendarToDelete) return;
    await deleteCalendar(calendarToDelete);
    setShowDeleteDialog(false);
    setCalendarToDelete(null);
  };

  const openEditModal = (cal: typeof calendars[0]) => {
    setEditingCalendar({
      id: cal.id,
      name: cal.name,
      color: cal.color,
    });
    setShowEditModal(true);
  };

  const openDeleteDialog = (id: string) => {
    setCalendarToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultCalendar(id);
    setShowDefaultPicker(false);
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
          <p className="text-xs text-muted-foreground">
            {usedHorahCalendars}/{maxHorahCalendars} calendários utilizados
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="relative px-4 pb-8 space-y-6 pt-4">
        {/* Default Calendar Card - Premium */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/10 shadow-xl shadow-black/5"
        >
          {/* Subtle glow effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="px-4 py-3 border-b border-border/10 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
              <p className="text-muted-foreground text-sm font-medium">Calendário Padrão</p>
            </div>
            
            <button
              onClick={() => setShowDefaultPicker(!showDefaultPicker)}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md" />
                  <img src={horahLogo} alt="Horah" className="relative w-10 h-10 rounded-xl shadow-lg object-contain" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-semibold">{defaultCalendar?.name || "Meu Calendário"}</span>
                    {defaultCalendar && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: defaultCalendar.color }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {defaultCalendar?.event_count || 0} eventos
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showDefaultPicker ? 'rotate-90' : ''}`} />
            </button>

            {/* Picker de calendário padrão */}
            <AnimatePresence>
              {showDefaultPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-t border-border/10"
                >
                  <div className="divide-y divide-border/10">
                    {horahCalendars.map((cal) => (
                      <button
                        key={cal.id}
                        onClick={() => handleSetDefault(cal.id)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: cal.color }}
                          />
                          <span className="text-foreground">{cal.name}</span>
                        </div>
                        {cal.is_default && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
          </div>
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="bg-card border border-border/10 rounded-2xl p-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/10 shadow-lg shadow-black/5">
              {horahCalendars.map((calendar, index) => (
                <motion.div
                  key={calendar.id}
                  className={`flex items-center justify-between px-4 py-4 ${
                    index < horahCalendars.length - 1 ? 'border-b border-border/10' : ''
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
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">{calendar.name}</span>
                        {calendar.is_default && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{calendar.event_count || 0} eventos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(calendar)}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {!calendar.is_default && horahCalendars.length > 1 && (
                      <button
                        onClick={() => openDeleteDialog(calendar.id)}
                        className="p-2 hover:bg-destructive/10 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Add Calendar Button - Premium */}
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (canCreateHorahCalendar) {
              setShowCreateModal(true);
            } else {
              navigate("/settings/subscription");
            }
          }}
          className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2.5 transition-all ${
            canCreateHorahCalendar
              ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-primary/35'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>
            {canCreateHorahCalendar
              ? "Adicionar Calendário"
              : `Limite atingido. Fazer upgrade`}
          </span>
        </motion.button>

        {/* Connect External Calendars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Conectar Calendário</h2>
          </div>
          
          <button
            onClick={() => setShowAddSheet(true)}
            className="w-full bg-card/60 backdrop-blur-sm border border-border/10 rounded-2xl p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <span className="text-foreground">Google, iCloud, Outlook...</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </motion.div>
      </div>

      {/* Modal Criar Calendário */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-t-3xl p-6 space-y-4 border-t border-border/10"
            >
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Novo Calendário</h2>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Nome</label>
                <Input
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                  placeholder="Ex: Trabalho, Pessoal..."
                  className="bg-background"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {CALENDAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCalendarColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        newCalendarColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateCalendar}
                disabled={!newCalendarName.trim()}
                className="w-full"
              >
                Criar Calendário
              </Button>
              <div className="h-4 safe-area-bottom" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Calendário */}
      <AnimatePresence>
        {showEditModal && editingCalendar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-t-3xl p-6 space-y-4 border-t border-border/10"
            >
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Editar Calendário</h2>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Nome</label>
                <Input
                  value={editingCalendar.name}
                  onChange={(e) =>
                    setEditingCalendar({ ...editingCalendar, name: e.target.value })
                  }
                  className="bg-background"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {CALENDAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setEditingCalendar({ ...editingCalendar, color })
                      }
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        editingCalendar.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={handleEditCalendar}
                disabled={!editingCalendar.name.trim()}
                className="w-full"
              >
                Salvar
              </Button>
              <div className="h-4 safe-area-bottom" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet Conectar Calendário Externo (Em breve) */}
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
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t border-border/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-border/30 rounded-full" />
              </div>
              
              <div className="px-4 pb-2">
                <h3 className="text-lg font-semibold text-foreground">Conectar Calendário</h3>
                <p className="text-sm text-muted-foreground">Em breve você poderá sincronizar</p>
              </div>
              
              <div className="p-4 space-y-2">
                {[
                  { icon: <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-md"><span className="text-sm font-bold text-red-500">G</span></div>, name: 'Google Calendar', desc: 'Em breve' },
                  { icon: <div className="w-7 h-7 bg-gradient-to-br from-sky-400 to-blue-600 rounded-lg shadow-md" />, name: 'iCloud Calendar', desc: 'Em breve' },
                  { icon: <div className="w-7 h-7 bg-[#0078D4] rounded-lg flex items-center justify-center shadow-md"><span className="text-white text-sm font-bold">O</span></div>, name: 'Outlook Calendar', desc: 'Em breve' },
                  { icon: <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-md"><Calendar className="w-4 h-4 text-white" /></div>, name: 'CalDAV', desc: 'Em breve' },
                ].map((item, index) => (
                  <motion.button 
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-muted/50 border border-border/10 opacity-50 cursor-not-allowed"
                    disabled
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

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir calendário?</AlertDialogTitle>
            <AlertDialogDescription>
              Os eventos deste calendário não serão excluídos, mas ficarão sem calendário associado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCalendar} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CalendarSettingsPage;
