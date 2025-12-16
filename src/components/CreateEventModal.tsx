import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Calendar, Clock, Bell, Repeat } from "lucide-react";
import type { Priority } from "./EventCard";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: {
    title: string;
    date: string;
    time: string;
    priority: Priority;
    alertType: string;
    repeat: string;
    notes: string;
  }) => void;
}

const CreateEventModal = ({ isOpen, onClose, onSave }: CreateEventModalProps) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [alertType, setAlertType] = useState("push");
  const [repeat, setRepeat] = useState("never");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, date, time, priority, alertType, repeat, notes });
    // Reset form
    setTitle("");
    setDate("");
    setTime("");
    setPriority("medium");
    setAlertType("push");
    setRepeat("never");
    setNotes("");
    onClose();
  };

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: "high", label: "Alta", color: "bg-kairo-red" },
    { value: "medium", label: "Média", color: "bg-kairo-amber" },
    { value: "low", label: "Baixa", color: "bg-kairo-green" },
  ];

  const alertTypes = [
    { value: "push", label: "Notificação" },
    { value: "fullscreen", label: "Tela cheia" },
    { value: "call", label: "Ligação" },
  ];

  const repeatOptions = [
    { value: "never", label: "Nunca" },
    { value: "daily", label: "Diário" },
    { value: "weekly", label: "Semanal" },
    { value: "monthly", label: "Mensal" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Novo Evento</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-accent"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-muted-foreground">
              Título
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente"
              className="kairo-input"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Data
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="kairo-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Hora
              </Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="kairo-input"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Prioridade</Label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all duration-200 ${
                    priority === p.value
                      ? `${p.color} text-background`
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Type */}
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Bell className="w-4 h-4" /> Tipo de alerta
            </Label>
            <div className="flex gap-2">
              {alertTypes.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAlertType(a.value)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all duration-200 ${
                    alertType === a.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat */}
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Repeat className="w-4 h-4" /> Repetição
            </Label>
            <div className="flex gap-2 flex-wrap">
              {repeatOptions.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRepeat(r.value)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    repeat === r.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-muted-foreground">
              Observações
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione detalhes..."
              rows={3}
              className="w-full kairo-input resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 kairo-button-secondary"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 kairo-button-primary disabled:opacity-50"
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
