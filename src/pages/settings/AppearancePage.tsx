import { Sun, Moon, Monitor, Check, Lock, Crown, Type } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { useFontPreference, FONT_OPTIONS, FontOption } from "@/hooks/useFontPreference";

type Theme = 'light' | 'dark' | 'system';

const THEMES: { id: Theme; icon: typeof Sun; label: string; description: string }[] = [
  { id: 'light', icon: Sun, label: 'Claro', description: 'Cores vibrantes com fundo branco' },
  { id: 'dark', icon: Moon, label: 'Escuro', description: 'Tons escuros e acentos quentes' },
  { id: 'system', icon: Monitor, label: 'Sistema', description: 'Segue as configurações do dispositivo' },
];

// Cores principais do tema escuro - Degradê Horah
const DARK_THEME_COLORS = [
  { color: '#1F5BFF', name: 'Azul vibrante' },
  { color: '#39B7E5', name: 'Azul ciano' },
  { color: '#63E0A3', name: 'Verde água' },
];

// Cores principais do tema claro - Degradê azul → verde água
const LIGHT_THEME_COLORS = [
  { color: 'hsl(220, 100%, 56%)', name: 'Azul vibrante' },
  { color: 'hsl(195, 75%, 56%)', name: 'Azul ciano' },
  { color: 'hsl(153, 65%, 63%)', name: 'Verde água' },
];

const AppearancePage = () => {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { currentFont, setFont, isPremium, fontOptions, loading: fontLoading } = useFontPreference();
  
  // Get current theme colors
  const currentColors = mounted && resolvedTheme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update meta theme-color when theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#272726' : '#FFFFFF');
    }
  }, [resolvedTheme, mounted]);

  const currentTheme = theme as Theme || 'dark';

  const handleFontSelect = (fontId: FontOption) => {
    if (!isPremium && fontId !== 'system') {
      // Navigate to subscription page
      navigate('/settings/subscription');
      return;
    }
    setFont(fontId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">Aparência</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Theme Selection */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Tema
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            {THEMES.map((themeOption, index) => (
              <button
                key={themeOption.id}
                onClick={() => setTheme(themeOption.id)}
                className={`w-full flex items-center justify-between px-4 py-4 ${
                  index < THEMES.length - 1 ? 'border-b border-border/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    currentTheme === themeOption.id 
                      ? 'bg-primary/20' 
                      : 'bg-background'
                  }`}>
                    <themeOption.icon className={`w-5 h-5 ${
                      currentTheme === themeOption.id 
                        ? 'text-primary' 
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="text-left">
                    <span className="text-foreground font-medium block">{themeOption.label}</span>
                    <span className="text-xs text-muted-foreground">{themeOption.description}</span>
                  </div>
                </div>
                {currentTheme === themeOption.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Font Selection */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs text-muted-foreground uppercase tracking-wider">
              Fonte
            </h2>
            {!isPremium && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <Crown className="w-3 h-3" />
                <span>Premium</span>
              </div>
            )}
          </div>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            {fontOptions.map((fontOption, index) => {
              const isSystem = fontOption.id === 'system';
              const isLocked = !isPremium && !isSystem;
              const isSelected = currentFont === fontOption.id;
              
              return (
                <button
                  key={fontOption.id}
                  onClick={() => handleFontSelect(fontOption.id)}
                  className={`w-full flex items-center justify-between px-4 py-4 ${
                    index < fontOptions.length - 1 ? 'border-b border-border/10' : ''
                  } ${isLocked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected 
                        ? 'bg-primary/20' 
                        : 'bg-background'
                    }`}>
                      <Type className={`w-5 h-5 ${
                        isSelected 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-foreground font-medium block"
                          style={{ fontFamily: fontOption.family }}
                        >
                          {fontOption.name}
                        </span>
                        {isLocked && (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{fontOption.description}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
          
          {!isPremium && (
            <button 
              onClick={() => navigate('/settings/subscription')}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl border border-primary/30"
            >
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Desbloqueie fontes personalizadas com Premium
              </span>
            </button>
          )}
        </div>

        {/* Preview */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Pré-visualização
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl p-4">
            <div className="flex gap-3">
              {/* Light theme preview */}
              <div className="flex-1 rounded-xl overflow-hidden border border-border/20">
                <div className="bg-white p-3 h-24 flex flex-col justify-between">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(220,100%,56%)]" />
                    <div className="w-2 h-2 rounded-full bg-[hsl(195,75%,56%)]" />
                    <div className="w-2 h-2 rounded-full bg-[hsl(153,65%,63%)]" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 w-3/4 rounded bg-gray-200" />
                    <div className="h-2 w-1/2 rounded bg-gray-100" />
                  </div>
                </div>
                <div className={`text-center py-1.5 text-xs font-medium ${
                  mounted && resolvedTheme === 'light' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-kairo-surface-3 text-muted-foreground'
                }`}>
                  Claro
                </div>
              </div>
              
              {/* Dark theme preview */}
              <div className="flex-1 rounded-xl overflow-hidden border border-border/20">
                <div className="bg-[#1a1a19] p-3 h-24 flex flex-col justify-between">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(12,95%,55%)]" />
                    <div className="w-2 h-2 rounded-full bg-[hsl(350,85%,50%)]" />
                    <div className="w-2 h-2 rounded-full bg-[hsl(280,70%,45%)]" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 w-3/4 rounded bg-[#2a2a29]" />
                    <div className="h-2 w-1/2 rounded bg-[#222221]" />
                  </div>
                </div>
                <div className={`text-center py-1.5 text-xs font-medium ${
                  mounted && resolvedTheme === 'dark' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-kairo-surface-3 text-muted-foreground'
                }`}>
                  Escuro
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              {currentTheme === 'system' 
                ? `Usando tema ${mounted && resolvedTheme === 'dark' ? 'escuro' : 'claro'} do sistema` 
                : currentTheme === 'dark' 
                  ? 'Tema escuro ativado'
                  : 'Tema claro com as cores vibrantes do Horah'
              }
            </p>
          </div>
        </div>

        {/* Accent Colors Preview */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Cores do Horah
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl p-4">
            <div className="flex items-center justify-center gap-2">
              {currentColors.map((item, index) => (
                <div 
                  key={index}
                  className="rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: item.color,
                    width: `${32 - (index * 4)}px`,
                    height: `${32 - (index * 4)}px`
                  }}
                  title={item.name}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              {mounted && resolvedTheme === 'dark' 
                ? 'Tons vibrantes e quentes para o tema escuro'
                : 'Cores alegres e suaves para o tema claro'
              }
            </p>
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground px-1">
          O tema "Sistema" segue automaticamente as configurações de aparência do seu dispositivo. A fonte padrão usa a tipografia nativa do seu dispositivo para melhor legibilidade.
        </p>
      </div>
    </div>
  );
};

export default AppearancePage;
