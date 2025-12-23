import React from "react";
import { format, parseISO } from "date-fns";
import { ptBR, enUS, es, fr, ja, ko, zhCN } from "date-fns/locale";
import { X, Share2, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

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
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const getLocale = () => {
    switch (language) {
      case 'en-US': return enUS;
      case 'es-ES': return es;
      case 'fr-FR': return fr;
      case 'ja-JP': return ja;
      case 'ko-KR': return ko;
      case 'zh-CN': return zhCN;
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
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getSettingsHint = () => {
    switch (language) {
      case 'en-US': return 'Set your weekly summary day in Settings → Smart Actions.';
      case 'es-ES': return 'Configura el día del resumen semanal en Configuración → Acciones Inteligentes.';
      case 'fr-FR': return 'Configurez le jour du résumé hebdomadaire dans Paramètres → Actions Intelligentes.';
      case 'ja-JP': return '設定 → スマートアクションで週間サマリーの曜日を設定できます。';
      case 'ko-KR': return '설정 → 스마트 작업에서 주간 요약 요일을 설정하세요.';
      case 'zh-CN': return '在设置 → 智能操作中配置周报日期。';
      default: return 'Configure o dia do resumo semanal em Configurações → Ações Inteligentes.';
    }
  };

  const gradientStyle = isDark 
    ? 'linear-gradient(135deg, #2F66C7 0%, #1E3F8F 50%, #05060C 100%)'
    : 'linear-gradient(135deg, #1F5BFF 0%, #39B7E5 50%, #63E0A3 100%)';

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh] bg-background border-border">
        {/* Drag handle bar */}
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mt-4" />
        
        <div className="overflow-y-auto max-h-[85vh]">
          {/* Header with gradient */}
          <div 
            className="relative p-6 pb-8 mt-2"
            style={{ background: gradientStyle }}
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
                  {language === 'en-US' ? 'Hours' : language === 'ja-JP' ? '時間' : language === 'ko-KR' ? '시간' : language === 'zh-CN' ? '小时' : 'Horas'}
                </p>
                <p className="text-foreground text-3xl font-bold">
                  {report.total_hours}
                </p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  {language === 'en-US' ? 'Events' : language === 'ja-JP' ? 'イベント' : language === 'ko-KR' ? '일정' : language === 'zh-CN' ? '活动' : 'Eventos'}
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
                   language === 'fr-FR' ? 'Répartition par Catégorie' :
                   language === 'ja-JP' ? 'カテゴリー分布' :
                   language === 'ko-KR' ? '카테고리 분포' :
                   language === 'zh-CN' ? '分类分布' :
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
                              ? (language === 'en-US' ? 'event' : language === 'ja-JP' ? 'イベント' : language === 'ko-KR' ? '일정' : language === 'zh-CN' ? '活动' : 'evento') 
                              : (language === 'en-US' ? 'events' : language === 'ja-JP' ? 'イベント' : language === 'ko-KR' ? '일정' : language === 'zh-CN' ? '活动' : 'eventos')})
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
                   language === 'fr-FR' ? 'Partager' :
                   language === 'ja-JP' ? '共有' :
                   language === 'ko-KR' ? '공유' :
                   language === 'zh-CN' ? '分享' :
                   'Compartilhar'}
                </span>
              </button>
            </div>
            
            {/* Settings hint */}
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 pb-6"
            >
              <Settings className="w-3 h-3" />
              {getSettingsHint()}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default WeeklyReportModal;