import { CreditCard, Crown, Calendar, Phone, Bell, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PLAN_DETAILS: Record<string, { name: string; price: string; features: string[] }> = {
  free: {
    name: "Grátis",
    price: "R$ 0",
    features: ["14 eventos por semana", "Alertas básicos", "Chat com IA", "Fonte do sistema"]
  },
  plus: {
    name: "Plus",
    price: "R$ 14,90/mês",
    features: ["50 eventos por semana", "Me Ligue ilimitado", "Alertas críticos", "Suporte prioritário", "Fontes personalizadas"]
  },
  super: {
    name: "Super",
    price: "R$ 29,90/mês",
    features: ["280 eventos por semana", "Me Ligue ilimitado", "Alertas críticos", "Suporte VIP", "Recursos exclusivos", "Fontes personalizadas"]
  }
};

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { subscription, limits, usedEvents, loading } = useSubscription();
  
  const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'
  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  
  const currentPlan = subscription?.plan || 'free';
  const planDetails = PLAN_DETAILS[currentPlan];
  const maxEvents = limits?.max_events_per_week || 14;
  const renewalDate = subscription?.expiresAt 
    ? format(new Date(subscription.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const handleCancelSubscription = () => {
    // TODO: Implement actual cancellation via Google Play Billing
    console.log('Cancel subscription clicked');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Assinatura</h1>
        </div>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Current Plan Card */}
        <div className="bg-gradient-to-br from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3] rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Plano Atual</p>
                <p className="text-white font-bold text-2xl">{planDetails.name}</p>
              </div>
            </div>
            
            {currentPlan !== 'free' && renewalDate && (
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-white/80 text-sm">
                  <span className="text-white font-medium">{planDetails.price}</span>
                  {' • '}Renova em {renewalDate}
                </p>
              </div>
            )}
            
            {currentPlan === 'free' && (
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-white/80 text-sm">
                  Você está usando o plano gratuito
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-kairo-surface-2 rounded-2xl p-4">
          <h3 className="text-foreground font-semibold mb-3">Uso desta semana</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-sm">Eventos criados</span>
            <span className="text-foreground font-medium">{usedEvents} / {maxEvents}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
              style={{ width: `${Math.min((usedEvents / maxEvents) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Plan Benefits */}
        <div className="bg-kairo-surface-2 rounded-2xl p-4">
          <h3 className="text-foreground font-semibold mb-3">Benefícios do seu plano</h3>
          <div className="space-y-3">
            {planDetails.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="text-foreground text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cancellation Section */}
        {currentPlan !== 'free' && (
          <div className="bg-kairo-surface-2 rounded-2xl p-4">
            <h3 className="text-foreground font-semibold mb-3">Cancelar assinatura</h3>
            
            {isIOS && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">
                    Para cancelar sua assinatura no iPhone, siga os passos abaixo:
                  </p>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground pl-8">
                  <li>Abra o app <strong className="text-foreground">Ajustes</strong> do iPhone</li>
                  <li>Toque no seu <strong className="text-foreground">nome</strong> no topo</li>
                  <li>Toque em <strong className="text-foreground">Assinaturas</strong></li>
                  <li>Selecione <strong className="text-foreground">Horah</strong></li>
                  <li>Toque em <strong className="text-foreground">Cancelar Assinatura</strong></li>
                </ol>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  Sua assinatura permanecerá ativa até o fim do período atual.
                </p>
              </div>
            )}
            
            {isAndroid && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ao cancelar, você manterá acesso aos benefícios até o fim do período atual.
                </p>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleCancelSubscription}
                >
                  Cancelar Assinatura
                </Button>
              </div>
            )}
            
            {!isIOS && !isAndroid && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Para cancelar sua assinatura, acesse o app no seu dispositivo móvel.
                </p>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>iOS:</strong> Ajustes → seu nome → Assinaturas → Horah
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Android:</strong> Use o botão no app Horah
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade CTA for Free Users */}
        {currentPlan === 'free' && (
          <Button 
            onClick={() => navigate('/settings/plan')}
            className="w-full bg-gradient-to-r from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3] text-white font-bold py-6 text-lg"
          >
            <Crown className="w-5 h-5 mr-2" />
            Fazer Upgrade
          </Button>
        )}

        {/* Change Plan Link */}
        {currentPlan !== 'free' && (
          <button 
            onClick={() => navigate('/settings/plan')}
            className="w-full flex items-center justify-between py-4 px-4 bg-kairo-surface-2 rounded-2xl group hover:bg-kairo-surface-3 transition-colors"
          >
            <span className="text-foreground font-medium">Mudar de plano</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
