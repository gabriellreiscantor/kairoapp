import { ChevronLeft, Sun, Moon, Monitor, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

type Theme = 'light' | 'dark' | 'system';

const THEMES: { id: Theme; icon: typeof Sun; label: string }[] = [
  { id: 'light', icon: Sun, label: 'Claro' },
  { id: 'dark', icon: Moon, label: 'Escuro' },
  { id: 'system', icon: Monitor, label: 'Sistema' },
];

const AppearancePage = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('dark');

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
                className={`w-full flex items-center justify-between px-4 py-3.5 ${
                  index < THEMES.length - 1 ? 'border-b border-border/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <themeOption.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{themeOption.label}</span>
                </div>
                {theme === themeOption.id && (
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
              <div className="flex-1 h-24 rounded-xl bg-background border border-border/20" />
              <div className="flex-1 h-24 rounded-xl bg-kairo-surface-3 border border-border/20" />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              {theme === 'system' 
                ? 'Segue as configurações do dispositivo' 
                : theme === 'dark' 
                  ? 'Tema escuro ativado'
                  : 'Tema claro ativado'
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
