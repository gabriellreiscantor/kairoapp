import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import BackButton from "@/components/BackButton";

const AboutPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">{t('about.title')}</h1>
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

        {/* Version & Company Info */}
        <div className="text-center mt-8 space-y-1">
          <p className="text-muted-foreground">
            {t('about.version')} 1.33
          </p>
          <p className="text-muted-foreground text-sm">
            Savini Comunicação LTDA
          </p>
          <p className="text-muted-foreground/70 text-xs">
            G.R
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
