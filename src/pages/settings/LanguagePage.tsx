import { ChevronLeft, Check, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLanguage, LanguageCode } from "@/contexts/LanguageContext";

const LANGUAGES = [
  { code: 'pt-BR' as LanguageCode, name: 'Português (Brasil)', native: 'Português (Brasil)' },
  { code: 'en-US' as LanguageCode, name: 'English (US)', native: 'English (US)' },
  { code: 'es-ES' as LanguageCode, name: 'Spanish', native: 'Español' },
  { code: 'fr-FR' as LanguageCode, name: 'French', native: 'Français' },
  { code: 'de-DE' as LanguageCode, name: 'German', native: 'Deutsch' },
  { code: 'it-IT' as LanguageCode, name: 'Italian', native: 'Italiano' },
  { code: 'ja-JP' as LanguageCode, name: 'Japanese', native: '日本語' },
  { code: 'ko-KR' as LanguageCode, name: 'Korean', native: '한국어' },
  { code: 'zh-CN' as LanguageCode, name: 'Chinese (Simplified)', native: '简体中文' },
];

const LanguagePage = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.native.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLanguageChange = (langCode: LanguageCode) => {
    setLanguage(langCode);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-full bg-kairo-surface-2 flex items-center justify-center z-10 relative"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground -ml-12 pointer-events-none">
          {t('language.title')}
        </h1>
      </header>

      <div className="px-4 pb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('language.search')}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-kairo-surface-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Languages List */}
        <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
          {filteredLanguages.map((lang, index) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center justify-between px-4 py-3.5 ${
                index < filteredLanguages.length - 1 ? 'border-b border-border/10' : ''
              }`}
            >
              <div>
                <p className="text-foreground text-left">{lang.native}</p>
                <p className="text-xs text-muted-foreground text-left">{lang.name}</p>
              </div>
              {language === lang.code && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground px-1">
          {t('language.note')}
        </p>
      </div>
    </div>
  );
};

export default LanguagePage;
