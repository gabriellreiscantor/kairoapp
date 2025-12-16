import { ChevronLeft, Crown, MessageSquare, Infinity, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "WhatsApp Ilimitado",
    description: "Crie e gerencie eventos via WhatsApp sem limites",
    premium: true,
  },
  {
    icon: Infinity,
    title: "Eventos Ilimitados",
    description: "Sem limite de eventos agendados",
    premium: true,
  },
  {
    icon: Clock,
    title: "Alertas Críticos",
    description: "Alertas que ignoram o modo silencioso",
    premium: true,
  },
];

const SpecialFeaturesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 py-4 safe-area-top flex items-center">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-full bg-kairo-surface-2 flex items-center justify-center z-10 relative"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground -ml-12 pointer-events-none">Recursos Premium</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Premium Banner */}
        <div className="gradient-plan rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-7 h-7 text-white" />
            <div>
              <h2 className="text-white font-bold text-lg">Kairo Premium</h2>
              <p className="text-white/70 text-sm">Desbloqueie todo o potencial</p>
            </div>
          </div>
          <button className="w-full py-3 rounded-xl bg-white text-primary font-semibold">
            Atualizar Agora
          </button>
        </div>

        {/* Features List */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Recursos Premium
          </h2>
          <div className="space-y-3">
            {FEATURES.map((feature, index) => (
              <div 
                key={index}
                className="bg-kairo-surface-2 rounded-2xl p-4 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-foreground font-semibold">{feature.title}</h3>
                    {feature.premium && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Free vs Premium Comparison */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Comparação de Planos
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 px-4 py-3 border-b border-border/10">
              <span className="text-muted-foreground text-sm">Recurso</span>
              <span className="text-muted-foreground text-sm text-center">Grátis</span>
              <span className="text-primary text-sm text-center font-medium">Premium</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 border-b border-border/10">
              <span className="text-foreground text-sm">Eventos</span>
              <span className="text-muted-foreground text-sm text-center">14</span>
              <span className="text-foreground text-sm text-center">∞</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 border-b border-border/10">
              <span className="text-foreground text-sm">WhatsApp</span>
              <span className="text-muted-foreground text-sm text-center">5/mês</span>
              <span className="text-foreground text-sm text-center">∞</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 border-b border-border/10">
              <span className="text-foreground text-sm">Me Ligue</span>
              <span className="text-foreground text-sm text-center">✓</span>
              <span className="text-foreground text-sm text-center">✓</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3">
              <span className="text-foreground text-sm">Alertas Críticos</span>
              <span className="text-muted-foreground text-sm text-center">—</span>
              <span className="text-foreground text-sm text-center">✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialFeaturesPage;
