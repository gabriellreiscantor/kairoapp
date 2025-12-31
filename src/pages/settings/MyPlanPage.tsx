import { Check, Loader2, Sparkles, Zap, Crown, Clock, Calendar, MessageSquare, Shield, HelpCircle, ChevronDown, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import BackButton from "@/components/BackButton";

type PlanType = 'free' | 'plus' | 'super';

const MyPlanPage = () => {
  const navigate = useNavigate();
  const { subscription, limits, usedEvents, loading } = useSubscription();
  
  const currentPlan = subscription?.plan || 'free';
  const maxEvents = limits?.max_events_per_week || 14;
  const progress = maxEvents > 0 ? (usedEvents / maxEvents) * 100 : 0;
  
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('plus');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const planData: Record<PlanType, {
    name: string;
    icon: typeof Sparkles;
    tagline: string;
    monthlyPrice: string;
    yearlyPrice: string;
    color: string;
    features: { icon: typeof Clock; text: string; highlight?: string }[];
  }> = {
    free: {
      name: 'Grátis',
      icon: Sparkles,
      tagline: 'Para começar',
      monthlyPrice: 'R$ 0',
      yearlyPrice: 'R$ 0',
      color: 'muted-foreground',
      features: [
        { icon: Calendar, text: 'eventos por semana', highlight: '14' },
        { icon: Calendar, text: 'calendários externos', highlight: '2' },
        { icon: MessageSquare, text: 'Horah Chat básico' },
        { icon: Shield, text: 'Suporte por email' },
      ]
    },
    plus: {
      name: 'Plus',
      icon: Zap,
      tagline: 'Mais escolhido',
      monthlyPrice: 'R$ 14,90',
      yearlyPrice: 'R$ 148,40',
      color: 'primary',
      features: [
        { icon: Calendar, text: 'eventos por semana', highlight: '50' },
        { icon: Calendar, text: 'calendários externos', highlight: '15' },
        { icon: MessageSquare, text: 'Horah Chat 5× capacidade' },
        { icon: Shield, text: 'Detecção de conflitos' },
        { icon: Clock, text: 'Visão geral diária' },
      ]
    },
    super: {
      name: 'Super',
      icon: Crown,
      tagline: 'Produtividade máxima',
      monthlyPrice: 'R$ 29,90',
      yearlyPrice: 'R$ 297,80',
      color: 'kairo-amber',
      features: [
        { icon: Calendar, text: 'eventos por semana', highlight: '280' },
        { icon: Calendar, text: 'calendários externos', highlight: '25' },
        { icon: MessageSquare, text: 'Horah Chat 20× capacidade' },
        { icon: Shield, text: 'Detecção de conflitos' },
        { icon: Clock, text: 'Visão geral diária' },
        { icon: Sparkles, text: 'Suporte prioritário' },
      ]
    }
  };

  const faqs = [
    { 
      icon: Clock,
      question: 'Como funciona o teste gratuito?', 
      answer: 'São 7 dias completos para explorar todos os recursos premium. Cancele antes do fim e não será cobrado nada.' 
    },
    { 
      icon: Calendar,
      question: 'Posso usar em vários dispositivos?', 
      answer: 'Sim! Sua conta sincroniza automaticamente em todos os seus dispositivos.' 
    },
    { 
      icon: Shield,
      question: 'Como cancelo a assinatura?', 
      answer: 'Vá nas configurações da App Store ou Google Play. O cancelamento é imediato, sem burocracia.' 
    },
    { 
      icon: RotateCcw,
      question: 'E se eu mudar de plano?', 
      answer: 'Você pode fazer upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente.' 
    },
  ];

  const getResetTime = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = 7 - dayOfWeek;
    return `${daysUntilSunday} dia${daysUntilSunday !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlanData = planData[currentPlan];
  const selectedPlanData = planData[selectedPlan];
  const CurrentPlanIcon = currentPlanData.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col hide-scrollbar overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 py-4 safe-area-top flex items-center border-b border-border/10 relative">
        <BackButton />
        <h1 className="absolute left-0 right-0 text-center text-lg font-semibold text-foreground pointer-events-none">Planos</h1>
      </header>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="px-4 pb-72 pt-4">
          
          {/* Current Plan Compact Banner */}
          <div className="flex items-center gap-3 p-4 bg-kairo-surface-1 rounded-2xl mb-6">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              currentPlan === 'free' && "bg-muted",
              currentPlan === 'plus' && "bg-primary/20",
              currentPlan === 'super' && "bg-kairo-amber/20"
            )}>
              <CurrentPlanIcon className={cn(
                "w-5 h-5",
                currentPlan === 'free' && "text-muted-foreground",
                currentPlan === 'plus' && "text-primary",
                currentPlan === 'super' && "text-kairo-amber"
              )} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Plano atual</p>
              <p className="text-foreground font-semibold">{currentPlanData.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Esta semana</p>
              <p className="text-foreground font-medium">{usedEvents}/{maxEvents}</p>
            </div>
            {/* Mini progress bar */}
            <div className="w-16 h-1.5 bg-kairo-surface-3 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  progress > 80 ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Billing Period Toggle - Prominent Position */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative bg-kairo-surface-2 rounded-2xl p-1 flex w-full max-w-xs">
              <div 
                className={cn(
                  "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-foreground rounded-xl transition-transform duration-300",
                  billingPeriod === 'yearly' && "translate-x-[calc(100%+8px)]"
                )}
              />
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-medium transition-colors relative z-10",
                  billingPeriod === 'monthly' ? "text-background" : "text-muted-foreground"
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-medium transition-colors relative z-10 flex items-center justify-center gap-1.5",
                  billingPeriod === 'yearly' ? "text-background" : "text-muted-foreground"
                )}
              >
                Anual
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  billingPeriod === 'yearly' ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
                )}>
                  -17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Selector Tabs */}
          <div className="flex gap-2 mb-6">
            {(['free', 'plus', 'super'] as PlanType[]).map((plan) => {
              const data = planData[plan];
              const Icon = data.icon;
              const isSelected = selectedPlan === plan;
              const isRecommended = plan === 'super';
              
              return (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={cn(
                    "flex-1 py-3 px-2 rounded-xl transition-all duration-300 relative",
                    isSelected 
                      ? plan === 'super' 
                        ? "bg-kairo-amber/20 border-2 border-kairo-amber" 
                        : plan === 'plus'
                          ? "bg-primary/20 border-2 border-primary plan-glow-plus"
                          : "bg-kairo-surface-3 border-2 border-border"
                      : "bg-kairo-surface-2 border-2 border-transparent"
                  )}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 bg-primary text-primary-foreground rounded-full font-medium whitespace-nowrap">
                      Recomendado
                    </span>
                  )}
                  <Icon className={cn(
                    "w-4 h-4 mx-auto mb-1",
                    isSelected && plan === 'plus' && "text-primary",
                    isSelected && plan === 'super' && "text-kairo-amber",
                    !isSelected && "text-muted-foreground"
                  )} />
                  <p className={cn(
                    "text-xs font-semibold",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {data.name}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Plan Details */}
          <div className={cn(
            "rounded-3xl p-6 mb-8 transition-all duration-300",
            selectedPlan === 'plus' && "bg-gradient-to-br from-primary/10 via-kairo-surface-2 to-kairo-surface-2 border border-primary/30",
            selectedPlan === 'super' && "bg-gradient-to-br from-kairo-amber/10 via-kairo-surface-2 to-kairo-surface-2 border border-kairo-amber/30",
            selectedPlan === 'free' && "bg-kairo-surface-2 border border-border/30"
          )}>
            {/* Plan Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className={cn(
                  "text-sm font-medium mb-1",
                  selectedPlan === 'plus' && "text-primary",
                  selectedPlan === 'super' && "text-kairo-amber",
                  selectedPlan === 'free' && "text-muted-foreground"
                )}>
                  {selectedPlanData.tagline}
                </p>
                <h2 className="text-3xl font-bold text-foreground">
                  {billingPeriod === 'monthly' ? selectedPlanData.monthlyPrice : selectedPlanData.yearlyPrice}
                  {selectedPlan !== 'free' && (
                    <span className="text-base font-normal text-muted-foreground">
                      /{billingPeriod === 'monthly' ? 'mês' : 'ano'}
                    </span>
                  )}
                </h2>
              </div>
              {selectedPlan !== 'free' && (
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  selectedPlan === 'plus' && "bg-primary/20",
                  selectedPlan === 'super' && "bg-kairo-amber/20"
                )}>
                  {selectedPlan === 'plus' ? (
                    <Zap className="w-6 h-6 text-primary" />
                  ) : (
                    <Crown className="w-6 h-6 text-kairo-amber" />
                  )}
                </div>
              )}
            </div>

            {/* Features List */}
            <div className="space-y-3">
              {selectedPlanData.features.map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      selectedPlan === 'plus' && "bg-primary/10",
                      selectedPlan === 'super' && "bg-kairo-amber/10",
                      selectedPlan === 'free' && "bg-muted"
                    )}>
                      <FeatureIcon className={cn(
                        "w-4 h-4",
                        selectedPlan === 'plus' && "text-primary",
                        selectedPlan === 'super' && "text-kairo-amber",
                        selectedPlan === 'free' && "text-muted-foreground"
                      )} />
                    </div>
                    <p className="text-foreground text-sm">
                      {feature.highlight && (
                        <span className={cn(
                          "font-bold mr-1",
                          selectedPlan === 'plus' && "text-primary",
                          selectedPlan === 'super' && "text-kairo-amber"
                        )}>
                          {feature.highlight}
                        </span>
                      )}
                      {feature.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Cancel anytime note */}
            {selectedPlan !== 'free' && (
              <p className="text-xs text-muted-foreground mt-6 text-center">
                Cancele a qualquer momento • Sem compromisso
              </p>
            )}
          </div>

          {/* FAQ Section - Card Style */}
          <div className="mb-8">
            <h3 className="text-foreground font-semibold text-lg mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              Perguntas frequentes
            </h3>
            
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const FaqIcon = faq.icon;
                const isExpanded = expandedFaq === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full text-left bg-kairo-surface-2 rounded-2xl overflow-hidden transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-8 h-8 rounded-lg bg-kairo-surface-3 flex items-center justify-center shrink-0">
                        <FaqIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="flex-1 text-foreground text-sm font-medium">{faq.question}</p>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-300",
                        isExpanded && "rotate-180"
                      )} />
                    </div>
                    <div className={cn(
                      "overflow-hidden transition-all duration-300",
                      isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <p className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button 
              onClick={() => navigate('/legal/terms')}
              className="text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              Termos
            </button>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <button 
              onClick={() => navigate('/legal/privacy')}
              className="text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              Privacidade
            </button>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <button 
              onClick={() => navigate('/legal/eula')}
              className="text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              EULA
            </button>
          </div>

        </div>
      </div>

      {/* Fixed Bottom CTA - Floating Pill Style */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom">
        <div className="bg-kairo-surface-1/95 backdrop-blur-xl rounded-3xl p-4 border border-border/20 shadow-2xl">
          {/* Price summary */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {selectedPlan === 'free' ? 'Plano atual' : 'Total'}
              </p>
              <p className="text-foreground font-bold text-lg">
                {billingPeriod === 'monthly' ? selectedPlanData.monthlyPrice : selectedPlanData.yearlyPrice}
                {selectedPlan !== 'free' && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /{billingPeriod === 'monthly' ? 'mês' : 'ano'}
                  </span>
                )}
              </p>
            </div>
            {selectedPlan !== 'free' && billingPeriod === 'yearly' && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground line-through">
                  R$ {selectedPlan === 'plus' ? '178,80' : '358,80'}/ano
                </p>
                <p className="text-xs text-primary font-medium">
                  Economia de R$ {selectedPlan === 'plus' ? '30,40' : '61,00'}
                </p>
              </div>
            )}
          </div>
          
          {/* CTA Button */}
          <button 
            disabled={selectedPlan === 'free' && currentPlan === 'free'}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-base transition-all duration-300",
              selectedPlan === 'free' && currentPlan === 'free'
                ? "bg-kairo-surface-3 text-muted-foreground cursor-not-allowed"
                : selectedPlan === 'super'
                  ? "bg-gradient-to-r from-kairo-amber to-kairo-amber/80 text-background"
                  : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            )}
          >
            {selectedPlan === 'free' && currentPlan === 'free' 
              ? 'Plano atual'
              : selectedPlan === 'free'
                ? 'Mudar para Grátis'
                : 'Começar 7 dias grátis'
            }
          </button>
          
          {/* Restore purchases */}
          <button className="w-full text-center text-muted-foreground text-xs mt-3 hover:text-foreground transition-colors">
            Restaurar compras
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPlanPage;
