import { ChevronLeft, Sun, Moon, Monitor, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Theme = 'light' | 'dark' | 'system';

const THEMES: { id: Theme; icon: typeof Sun; label: string; description: string }[] = [
  { id: 'light', icon: Sun, label: 'Claro', description: 'Cores vibrantes com fundo branco' },
  { id: 'dark', icon: Moon, label: 'Escuro', description: 'Tons escuros e acentos quentes' },
  { id: 'system', icon: Monitor, label: 'Sistema', description: 'Segue as configurações do dispositivo' },
];

// Cores principais do tema escuro
const DARK_THEME_COLORS = [
  { color: 'hsl(12, 95%, 55%)', name: 'Laranja vibrante' },
  { color: 'hsl(350, 85%, 50%)', name: 'Rosa quente' },
  { color: 'hsl(280, 70%, 45%)', name: 'Roxo profundo' },
  { color: 'hsl(160, 60%, 40%)', name: 'Verde esmeralda' },
];

// Cores principais do tema claro
const LIGHT_THEME_COLORS = [
  { color: 'hsl(12, 95%, 55%)', name: 'Laranja coral' },
  { color: 'hsl(38, 90%, 48%)', name: 'Âmbar dourado' },
  { color: 'hsl(160, 55%, 38%)', name: 'Verde suave' },
  { color: 'hsl(0, 65%, 48%)', name: 'Vermelho coral' },
];

const AppearancePage = () => {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
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
                    <div className="w-2 h-2 rounded-full bg-[hsl(12,95%,55%)]" />
                    <div className="w-2 h-2 rounded-full bg-[hsl(350,85%,50%)]" />
                    <div className="w-2 h-2 rounded-full bg-[hsl(280,70%,45%)]" />
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
                  : 'Tema claro com as cores vibrantes do Kairo'
              }
            </p>
          </div>
        </div>

        {/* Accent Colors Preview */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Cores do Kairo
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
          O tema "Sistema" segue automaticamente as configurações de aparência do seu dispositivo.
        </p>
      </div>
    </div>
  );
};

export default AppearancePage;
