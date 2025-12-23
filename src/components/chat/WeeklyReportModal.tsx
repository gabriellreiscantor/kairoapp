import React from "react";
import { format, parseISO } from "date-fns";
import { ptBR, enUS, es, fr } from "date-fns/locale";
import { X, Share2, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CategoryDistribution {
  category: string;
  originalCategory: string;
  count: number;
  percentage: number;
  color: string;
}

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: {
    id: string;
    week_number: number;
    week_start: string;
    week_end: string;
    total_events: number;
    total_hours: number;
    category_distribution: CategoryDistribution[];
    headline: string;
    description?: string;
    language?: string;
  };
  onOpenSettings?: () => void;
}

const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({ 
  isOpen, 
  onClose, 
  report,
  onOpenSettings 
}) => {
  const { language, t } = useLanguage();
  
  const getLocale = () => {
    switch (language) {
      case 'en-US': return enUS;
      case 'es-ES': return es;
      case 'fr-FR': return fr;
      default: return ptBR;
    }
  };

  const formatDateRange = () => {
    try {
      const start = parseISO(report.week_start);
      const end = parseISO(report.week_end);
      const locale = getLocale();
      
      return `${format(start, "d 'de' MMMM", { locale })} - ${format(end, "d 'de' MMMM", { locale })}`;
    } catch {
      return `${report.week_start} - ${report.week_end}`;
    }
  };

  const handleShare = async () => {
    try {
      const shareText = `📊 Minha semana S${report.week_number}\n\n${report.headline}\n\n🕐 ${report.total_hours} horas | 📅 ${report.total_events} eventos\n\nGerado pelo Horah`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Resumo Semanal S${report.week_number}`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        // Could show a toast here
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getSettingsHint = () => {
    switch (language) {
      case 'en-US': return 'Weekly summary can be adjusted in Settings → Smart Tasks.';
      case 'es-ES': return 'El resumen semanal se puede ajustar en Configuración → Tareas Inteligentes.';
      case 'fr-FR': return 'Le résumé hebdomadaire peut être ajusté dans Paramètres → Tâches Intelligentes.';
      default: return 'Resumo semanal pode ser ajustado em Configurações → Tarefas Inteligentes.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-background border-border overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header with gradient */}
        <div 
          className="relative p-6 pb-8"
          style={{
            background: 'linear-gradient(135deg, #1F5BFF 0%, #39B7E5 50%, #63E0A3 100%)',
          }}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          {/* Week info */}
          <div className="mb-4">
            <span className="bg-white/20 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-full">
              S{report.week_number}
            </span>
          </div>
          
          <p className="text-white/80 text-sm mb-2">
            {formatDateRange()}
          </p>
          
          {/* Headline */}
          <h2 className="text-white text-2xl font-bold leading-tight">
            {report.headline}
          </h2>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {report.description && (
            <p className="text-muted-foreground leading-relaxed">
              {report.description}
            </p>
          )}
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-8 py-4">
            <div className="text-center">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                {language === 'en-US' ? 'Hours' : 'Horas'}
              </p>
              <p className="text-foreground text-3xl font-bold">
                {report.total_hours}
              </p>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                {language === 'en-US' ? 'Events' : 'Eventos'}
              </p>
              <p className="text-foreground text-3xl font-bold">
                {report.total_events}
              </p>
            </div>
          </div>
          
          {/* Category distribution */}
          {report.category_distribution.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                {language === 'en-US' ? 'Category Distribution' : 
                 language === 'es-ES' ? 'Distribución por Categoría' : 
                 'Distribuição por Categoria'}
              </h3>
              
              <div className="space-y-3">
                {report.category_distribution.map((cat, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-foreground font-medium">
                          {cat.category}
                        </span>
                        <span className="text-muted-foreground">
                          ({cat.count} {cat.count === 1 
                            ? (language === 'en-US' ? 'event' : 'evento') 
                            : (language === 'en-US' ? 'events' : 'eventos')})
                        </span>
                      </div>
                      <span className="text-muted-foreground font-medium">
                        {cat.percentage}%
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Share button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="font-medium">
                {language === 'en-US' ? 'Share' : 
                 language === 'es-ES' ? 'Compartir' : 
                 'Compartilhar'}
              </span>
            </button>
          </div>
          
          {/* Settings hint */}
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <Settings className="w-3 h-3" />
            {getSettingsHint()}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyReportModal;
