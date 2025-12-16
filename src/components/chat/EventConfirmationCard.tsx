import { Check, Pencil } from "lucide-react";

interface EventConfirmationCardProps {
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

const EventConfirmationCard = ({ resumo, onConfirm, onEdit }: EventConfirmationCardProps) => {
  return (
    <div className="bg-kairo-surface-2 border border-border/30 rounded-2xl p-4 max-w-[300px]">
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Evento:</span>
          <span className="text-sm font-medium text-foreground">{resumo.titulo}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Data:</span>
          <span className="text-sm text-foreground">{resumo.data}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Hora:</span>
          <span className="text-sm text-foreground">{resumo.hora}</span>
        </div>
        {resumo.local && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Local:</span>
            <span className="text-sm text-foreground">{resumo.local}</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Check className="w-4 h-4" />
          Confirmar
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-2 bg-muted text-muted-foreground rounded-xl py-2.5 px-4 text-sm hover:bg-muted/80 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default EventConfirmationCard;
