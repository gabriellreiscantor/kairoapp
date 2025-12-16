import { ChevronLeft, Check, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)', native: 'Português (Brasil)' },
  { code: 'en-US', name: 'English (US)', native: 'English (US)' },
  { code: 'es-ES', name: 'Spanish', native: 'Español' },
  { code: 'fr-FR', name: 'French', native: 'Français' },
  { code: 'de-DE', name: 'German', native: 'Deutsch' },
  { code: 'it-IT', name: 'Italian', native: 'Italiano' },
  { code: 'ja-JP', name: 'Japanese', native: '日本語' },
  { code: 'ko-KR', name: 'Korean', native: '한국어' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
  { code: 'ar-SA', name: 'Arabic', native: 'العربية' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ru-RU', name: 'Russian', native: 'Русский' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', native: 'Português (Portugal)' },
  { code: 'nl-NL', name: 'Dutch', native: 'Nederlands' },
  { code: 'tr-TR', name: 'Turkish', native: 'Türkçe' },
  { code: 'pl-PL', name: 'Polish', native: 'Polski' },
  { code: 'th-TH', name: 'Thai', native: 'ไทย' },
  { code: 'vi-VN', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'id-ID', name: 'Indonesian', native: 'Bahasa Indonesia' },
];

const LanguagePage = () => {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('pt-BR');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.native.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Idioma</h1>
      </header>

      <div className="px-4 pb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar idioma..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-kairo-surface-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Languages List */}
        <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
          {filteredLanguages.map((language, index) => (
            <button
              key={language.code}
              onClick={() => setSelectedLanguage(language.code)}
              className={`w-full flex items-center justify-between px-4 py-3.5 ${
                index < filteredLanguages.length - 1 ? 'border-b border-border/10' : ''
              }`}
            >
              <div>
                <p className="text-foreground text-left">{language.native}</p>
                <p className="text-xs text-muted-foreground text-left">{language.name}</p>
              </div>
              {selectedLanguage === language.code && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground px-1">
          O idioma será aplicado a toda a interface do Kairo. Algumas traduções podem estar incompletas.
        </p>
      </div>
    </div>
  );
};

export default LanguagePage;
