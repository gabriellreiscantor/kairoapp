import { X, Calendar, Clock, MapPin, Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface EventConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumo: {
    titulo: string;
    data: string;
    hora: string;
    local: string;
    notificacao: string;
  };
  onConfirm: () => void;
  onEdit: () => void;
}

const EventConfirmationModal = ({ 
  isOpen, 
  onClose, 
  resumo, 
  onConfirm, 
  onEdit 
}: EventConfirmationModalProps) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleEdit = () => {
    onEdit();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[360px] p-0 gap-0 bg-background border-border/30 rounded-3xl overflow-hidden">
        <DialogTitle className="sr-only">Confirmar Evento</DialogTitle>
        
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 px-6 py-8 text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/50 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground">
            {resumo.titulo}
          </h2>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-kairo-surface-2 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="text-sm font-medium text-foreground">{resumo.data}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-kairo-surface-2 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hora</p>
              <p className="text-sm font-medium text-foreground">{resumo.hora}</p>
            </div>
          </div>

          {resumo.local && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-kairo-surface-2 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Local</p>
                <p className="text-sm font-medium text-foreground">{resumo.local}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-kairo-surface-2 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Notificação</p>
              <p className="text-sm font-medium text-foreground">{resumo.notificacao || "30 min antes"}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <button
            onClick={handleEdit}
            className="flex-1 py-3.5 rounded-xl border border-border/30 text-foreground font-medium text-sm hover:bg-kairo-surface-2 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventConfirmationModal;
