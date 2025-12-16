import { ChevronLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const AboutPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-kairo-surface-1 px-4 py-4 safe-area-top flex items-center">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-full bg-kairo-surface-2 flex items-center justify-center z-10 relative"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground -ml-12 pointer-events-none">
          {t('about.title')}
        </h1>
      </header>

      <div className="px-4 pb-8 pt-4">
        {/* Legal Links */}
        <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
          <button 
            onClick={() => navigate('/terms')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-border/10"
          >
            <span className="text-foreground">{t('about.terms')}</span>
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
          </button>
          <button 
            onClick={() => navigate('/privacy')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-border/10"
          >
            <span className="text-foreground">{t('about.privacy')}</span>
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center justify-between px-4 py-4">
            <span className="text-foreground">{t('about.faq')}</span>
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-muted-foreground mt-8">
          {t('about.version')} 1.0.0 (1)
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
