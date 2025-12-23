import React from "react";
import { format, parseISO } from "date-fns";
import { ptBR, enUS, es, fr } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CategoryDistribution {
  category: string;
  originalCategory: string;
  count: number;
  percentage: number;
  color: string;
}

interface WeeklyReportCardProps {
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
  onClick: () => void;
}

const WeeklyReportCard: React.FC<WeeklyReportCardProps> = ({ report, onClick }) => {
  const { language } = useLanguage();
  
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
      
      return `${format(start, "d 'de' MMM", { locale })} - ${format(end, "d 'de' MMM", { locale })}`;
    } catch {
      return `${report.week_start} - ${report.week_end}`;
    }
  };

  // Get top 3 categories for chips
  const topCategories = report.category_distribution.slice(0, 3);

  // Split headline into lines for display
  const headlineLines = report.headline.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div 
      onClick={onClick}
      className="w-full max-w-[320px] cursor-pointer group animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
    >
      {/* Card with gradient background */}
      <div className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]">
        {/* Gradient background */}
        <div 
          className="absolute inset-0 opacity-90"
          style={{
            background: 'linear-gradient(135deg, #1F5BFF 0%, #39B7E5 50%, #63E0A3 100%)',
          }}
        />
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/10" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Week badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                S{report.week_number}
              </span>
              <span className="text-white/80 text-sm">
                {formatDateRange()}
              </span>
            </div>
          </div>
          
          {/* Headline */}
          <div className="mb-5">
            {headlineLines.length > 1 ? (
              <div className="space-y-0.5">
                {headlineLines.map((line, i) => (
                  <p key={i} className="text-white text-xl font-bold leading-tight capitalize">
                    {line}
                    {i < headlineLines.length - 1 && ','}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-white text-xl font-bold leading-tight">
                {report.headline}
              </p>
            )}
          </div>
          
          {/* Category chips */}
          {topCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {topCategories.map((cat, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5"
                >
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-white/90 text-xs font-medium truncate max-w-[80px]">
                    {cat.category}
                  </span>
                  <span className="text-white/60 text-xs">
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* Stats and CTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">
                  {language === 'en-US' ? 'Hours' : language === 'es-ES' ? 'Horas' : 'Horas'}
                </p>
                <p className="text-white text-lg font-bold">
                  {report.total_hours}
                </p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">
                  {language === 'en-US' ? 'Events' : language === 'es-ES' ? 'Eventos' : 'Eventos'}
                </p>
                <p className="text-white text-lg font-bold">
                  {report.total_events}
                </p>
              </div>
            </div>
            
            {/* Read more button */}
            <button className="flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full transition-colors">
              {language === 'en-US' ? 'Read more' : language === 'es-ES' ? 'Ver más' : 'Ler mais'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportCard;
