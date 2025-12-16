import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const MyPlanPage = () => {
  const navigate = useNavigate();
  const usedEvents = 0;
  const maxEvents = 14;
  const progress = (usedEvents / maxEvents) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-kairo-surface-1 px-4 py-4 safe-area-top flex items-center">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground -ml-12">Meu plano</h1>
      </header>

      <div className="px-4 pb-8 pt-2 flex-1 flex flex-col">
        {/* Premium Banner */}
        <div className="gradient-plan rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold">PLUS</span>
            <span className="px-2 py-0.5 rounded bg-yellow-500 text-black text-xs font-bold">SUPER</span>
          </div>
          <h2 className="text-white font-bold text-xl text-center mb-1">Planos Kairo Premium</h2>
          <p className="text-white/80 text-center text-sm">Experimente grátis por 7 dias</p>
        </div>

        {/* Current Plan Section */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Meu Plano
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl p-4">
            <h3 className="text-foreground font-bold text-xl mb-4">Grátis</h3>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">Eventos agendados</span>
              <span className="text-foreground font-medium">{usedEvents} / {maxEvents}</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-kairo-surface-3" />
          </div>
          
          <p className="text-muted-foreground text-sm mt-3 px-1">
            O uso será redefinido em 16:43, 22 de dez..
          </p>
        </div>

        {/* Upgrade Button */}
        <button className="w-full py-4 rounded-2xl bg-kairo-surface-2 mt-6">
          <span className="text-primary font-medium">Atualizar agora</span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Manage Subscription */}
        <button className="w-full text-center text-muted-foreground py-4">
          Gerenciar assinatura e pagamentos
        </button>
      </div>
    </div>
  );
};

export default MyPlanPage;
