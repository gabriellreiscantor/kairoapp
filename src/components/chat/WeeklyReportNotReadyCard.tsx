import React from "react";
import { Calendar, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";

interface WeeklyReportNotReadyCardProps {
  daysRemaining: number;
}

const WeeklyReportNotReadyCard: React.FC<WeeklyReportNotReadyCardProps> = ({ daysRemaining }) => {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const getTitle = () => {
    switch (language) {
      case 'en-US': return 'Report not ready yet';
      case 'es-ES': return 'Informe aún no disponible';
      case 'fr-FR': return 'Rapport pas encore prêt';
      case 'ja-JP': return 'レポートはまだ準備中です';
      case 'ko-KR': return '리포트가 아직 준비되지 않았습니다';
      case 'zh-CN': return '报告尚未准备好';
      default: return 'Relatório ainda não disponível';
    }
  };

  const getMessage = () => {
    const days = daysRemaining === 1 ? (language === 'en-US' ? 'day' : language === 'es-ES' ? 'día' : language === 'ja-JP' ? '日' : language === 'ko-KR' ? '일' : language === 'zh-CN' ? '天' : 'dia') : (language === 'en-US' ? 'days' : language === 'es-ES' ? 'días' : language === 'ja-JP' ? '日' : language === 'ko-KR' ? '일' : language === 'zh-CN' ? '天' : 'dias');
    
    switch (language) {
      case 'en-US': return `Your first weekly report will be ready in ${daysRemaining} ${days}. Keep using Horah!`;
      case 'es-ES': return `Tu primer informe semanal estará listo en ${daysRemaining} ${days}. ¡Sigue usando Horah!`;
      case 'fr-FR': return `Votre premier rapport hebdomadaire sera prêt dans ${daysRemaining} ${days}. Continuez à utiliser Horah !`;
      case 'ja-JP': return `最初の週間レポートは${daysRemaining}${days}後に届きます。Horahを使い続けてね！`;
      case 'ko-KR': return `첫 주간 리포트가 ${daysRemaining}${days} 후에 준비됩니다. Horah를 계속 사용해주세요!`;
      case 'zh-CN': return `您的第一份周报将在 ${daysRemaining} ${days}后准备好。继续使用 Horah！`;
      default: return `Seu primeiro relatório semanal vai ficar pronto em ${daysRemaining} ${days}. Continue usando o Horah!`;
    }
  };

  return (
    <div className="w-full max-w-[320px] animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl p-5">
        {/* Gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, #2F66C7 0%, #1E3F8F 50%, #05060C 100%)'
              : 'linear-gradient(135deg, #1F5BFF 0%, #39B7E5 50%, #63E0A3 100%)',
          }}
        />
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/10" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide">
                {language === 'en-US' ? 'Weekly Report' : language === 'es-ES' ? 'Informe Semanal' : language === 'ja-JP' ? '週間レポート' : language === 'ko-KR' ? '주간 리포트' : language === 'zh-CN' ? '周报' : 'Relatório Semanal'}
              </p>
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-white text-lg font-bold mb-2">
            {getTitle()}
          </h3>
          
          {/* Message */}
          <p className="text-white/80 text-sm leading-relaxed mb-4">
            {getMessage()}
          </p>
          
          {/* Days counter */}
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 w-fit">
            <Calendar className="w-4 h-4 text-white/80" />
            <span className="text-white text-sm font-medium">
              {daysRemaining} {daysRemaining === 1 ? (language === 'en-US' ? 'day left' : language === 'es-ES' ? 'día restante' : language === 'ja-JP' ? '日残り' : language === 'ko-KR' ? '일 남음' : language === 'zh-CN' ? '天剩余' : 'dia restante') : (language === 'en-US' ? 'days left' : language === 'es-ES' ? 'días restantes' : language === 'ja-JP' ? '日残り' : language === 'ko-KR' ? '일 남음' : language === 'zh-CN' ? '天剩余' : 'dias restantes')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportNotReadyCard;
