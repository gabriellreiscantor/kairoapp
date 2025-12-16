import { ChevronLeft, Check, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MyPlanPage = () => {
  const navigate = useNavigate();
  const usedEvents = 0;
  const maxEvents = 14;
  const progress = (usedEvents / maxEvents) * 100;
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'plus' | 'super'>('plus');

  const plans = {
    plus: {
      monthlyPrice: 'R$ 14,90',
      yearlyPrice: 'R$ 148,40',
      tagline: 'Perfeito para o uso diário',
      features: [
        { highlight: '3x', text: 'eventos por semana' },
        { highlight: '', text: 'Lembretes ilimitados', isHighlight: true },
        { highlight: '15', text: 'calendários do Google/Apple' },
        { highlight: '', text: 'Cancele a qualquer momento' },
      ]
    },
    super: {
      monthlyPrice: 'R$ 29,90',
      yearlyPrice: 'R$ 297,80',
      tagline: 'Agende como um profissional',
      features: [
        { highlight: '20x', text: 'eventos por semana' },
        { highlight: '', text: 'Lembretes ilimitados', isHighlight: true },
        { highlight: '25', text: 'calendários do Google/Apple' },
        { highlight: '', text: 'Cancele a qualquer momento' },
      ]
    }
  };

  const comparisonData = [
    { feature: 'Eventos por semana', free: '14', plus: '50', super: '280' },
    { feature: 'Notificações', free: 'ilimitados', plus: 'ilimitados', super: 'ilimitados' },
    { feature: 'calendários do Google/Apple', free: '2', plus: '15', super: '25' },
    { feature: 'Calendários Kairo', free: '3', plus: '5', super: '30' },
    { feature: 'Detecção de conflito de agendamento', free: '–', plus: true, super: true },
    { feature: 'Visão geral da agenda diária', free: '–', plus: true, super: true },
    { feature: 'Kairo Chat', free: 'Limitado', plus: '5× capacidade', super: '20× capacidade' },
  ];

  const faqs = [
    { question: 'Como funciona o período de teste?', answer: 'Você tem 7 dias grátis para experimentar todos os recursos premium. Após esse período, será cobrado automaticamente.' },
    { question: 'Posso acessar meu Kairo Premium de outro dispositivo?', answer: 'Sim! Sua assinatura está vinculada à sua conta e funciona em qualquer dispositivo.' },
    { question: 'Como faço para solicitar um cancelamento ou reembolso para o Kairo Premium?', answer: 'Você pode cancelar a qualquer momento nas configurações da App Store ou Google Play.' },
    { question: 'Como transfiro minha assinatura do Kairo Premium para uma nova conta?', answer: 'Entre em contato com nosso suporte para transferir sua assinatura.' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col hide-scrollbar overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 py-4 safe-area-top flex items-center">
        <button 
          onClick={() => navigate('/')}
          className="w-12 h-12 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground -ml-12">Meu plano</h1>
      </header>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="px-4 pb-32">
          {/* Premium Banner */}
          <div className="gradient-plan rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold">PLUS</span>
              <span className="px-3 py-1 rounded-md bg-yellow-500 text-black text-xs font-bold">SUPER</span>
            </div>
            <h2 className="text-white font-bold text-2xl text-center mb-1">Planos Kairo Premium</h2>
            <p className="text-white/80 text-center text-sm">Experimente grátis por 7 dias</p>
          </div>

          {/* Current Plan Section */}
          <div className="mb-6">
            <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 px-1">
              MEU PLANO
            </h2>
            <div className="bg-kairo-surface-2 rounded-2xl p-5">
              <h3 className="text-foreground font-bold text-2xl mb-4">Grátis</h3>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground">Eventos agendados</span>
                <span className="text-foreground font-semibold">{usedEvents} / {maxEvents}</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-kairo-surface-3" />
            </div>
            
            <p className="text-muted-foreground text-sm mt-3 px-1">
              O uso será redefinido em 16:43, 22 de dez..
            </p>
          </div>

          {/* Upgrade Button */}
          <button className="w-full py-4 rounded-2xl bg-kairo-surface-2 mb-8">
            <span className="text-primary font-semibold text-lg">Atualizar agora</span>
          </button>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center mb-6">
            <div className="bg-kairo-surface-2 rounded-full p-1 flex mb-2">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === 'monthly' 
                    ? 'bg-foreground text-background' 
                    : 'text-muted-foreground'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === 'yearly' 
                    ? 'bg-foreground text-background' 
                    : 'text-muted-foreground'
                }`}
              >
                Anual
              </button>
            </div>
            <p className="text-muted-foreground text-sm">Economize 17% com a cobrança anual</p>
          </div>

          {/* Plan Cards */}
          <div className="space-y-4 mb-8">
            {/* PLUS Plan */}
            <button
              onClick={() => setSelectedPlan('plus')}
              className={`w-full bg-kairo-surface-2 rounded-2xl p-5 text-left relative z-10 cursor-pointer ${
                selectedPlan === 'plus' ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold">PLUS</span>
                  <span className="text-primary text-sm font-medium">{plans.plus.tagline}</span>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'plus' ? 'bg-foreground border-foreground' : 'border-muted-foreground'
                }`}>
                  {selectedPlan === 'plus' && <Check className="w-4 h-4 text-background" />}
                </div>
              </div>
              
              <div className="mb-4">
                <span className="text-foreground text-3xl font-bold">
                  {billingPeriod === 'monthly' ? plans.plus.monthlyPrice : plans.plus.yearlyPrice}
                </span>
                <span className="text-muted-foreground text-sm">/{billingPeriod === 'monthly' ? 'mês' : 'ano'}</span>
              </div>
              
              <ul className="space-y-2">
                {plans.plus.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    {feature.highlight && <span className="text-primary font-semibold">{feature.highlight}</span>}
                    <span className={feature.isHighlight ? 'text-primary font-medium' : 'text-foreground'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </button>

            {/* SUPER Plan */}
            <button
              onClick={() => setSelectedPlan('super')}
              className={`w-full bg-kairo-surface-2 rounded-2xl p-5 text-left relative z-10 cursor-pointer ${
                selectedPlan === 'super' ? 'ring-2 ring-yellow-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md bg-yellow-500 text-black text-xs font-bold">SUPER</span>
                  <span className="text-primary text-sm font-medium">{plans.super.tagline}</span>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'super' ? 'bg-foreground border-foreground' : 'border-muted-foreground'
                }`}>
                  {selectedPlan === 'super' && <Check className="w-4 h-4 text-background" />}
                </div>
              </div>
              
              <div className="mb-4">
                <span className="text-foreground text-3xl font-bold">
                  {billingPeriod === 'monthly' ? plans.super.monthlyPrice : plans.super.yearlyPrice}
                </span>
                <span className="text-muted-foreground text-sm">/{billingPeriod === 'monthly' ? 'mês' : 'ano'}</span>
              </div>
              
              <ul className="space-y-2">
                {plans.super.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    {feature.highlight && <span className="text-primary font-semibold">{feature.highlight}</span>}
                    <span className={feature.isHighlight ? 'text-primary font-medium' : 'text-foreground'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </button>
          </div>

          {/* Comparison Table */}
          <h3 className="text-foreground font-semibold text-lg text-center mb-6">Recursos Premium</h3>
          
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden mb-8">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-2 p-4 border-b border-border/20">
              <div></div>
              <div className="text-center">
                <span className="px-2 py-0.5 rounded bg-muted-foreground/30 text-foreground text-xs font-bold">FREE</span>
              </div>
              <div className="text-center bg-kairo-surface-3 rounded-t-lg py-2 -mt-2 -mb-2">
                <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold">PLUS</span>
              </div>
              <div className="text-center">
                <span className="px-2 py-0.5 rounded bg-yellow-500 text-black text-xs font-bold">SUPER</span>
              </div>
            </div>
            
            {/* Table Rows */}
            {comparisonData.map((row, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 p-4 border-b border-border/10 last:border-0">
                <div className="text-muted-foreground text-sm">{row.feature}</div>
                <div className="text-center text-muted-foreground text-sm">{row.free}</div>
                <div className="text-center bg-kairo-surface-3 py-2 -my-4 flex items-center justify-center">
                  {typeof row.plus === 'boolean' ? (
                    <Check className="w-4 h-4 text-foreground" />
                  ) : (
                    <span className="text-foreground text-sm font-medium">{row.plus}</span>
                  )}
                </div>
                <div className="text-center text-sm">
                  {typeof row.super === 'boolean' ? (
                    <Check className="w-4 h-4 text-foreground mx-auto" />
                  ) : (
                    <span className="text-foreground">{row.super}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <h3 className="text-foreground font-semibold text-lg text-center mb-4">Perguntas e Respostas</h3>
          
          <Accordion type="single" collapsible className="space-y-2 mb-8">
            {faqs.map((faq, idx) => (
              <AccordionItem 
                key={idx} 
                value={`faq-${idx}`}
                className="border-b border-border/20"
              >
                <AccordionTrigger className="text-foreground text-left py-4 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button 
              onClick={() => navigate('/legal/terms')}
              className="text-muted-foreground text-sm"
            >
              Termos de Serviço
            </button>
            <button 
              onClick={() => navigate('/legal/privacy')}
              className="text-muted-foreground text-sm"
            >
              Política de Privacidade
            </button>
          </div>

          {/* Manage Subscription */}
          <button className="w-full text-center text-muted-foreground py-4">
            Gerenciar assinatura e pagamentos
          </button>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/20 p-4 safe-area-bottom">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted-foreground text-sm">Economize 17% com a cobrança anual</span>
          <div 
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${
              billingPeriod === 'yearly' ? 'bg-primary' : 'bg-kairo-surface-3'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              billingPeriod === 'yearly' ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => setSelectedPlan('plus')}
            className={`p-3 rounded-xl border-2 ${
              selectedPlan === 'plus' ? 'border-primary bg-kairo-surface-2' : 'border-border bg-kairo-surface-2'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold">PLUS</span>
              {selectedPlan === 'plus' && <Check className="w-4 h-4 text-primary" />}
            </div>
            <span className="text-foreground text-sm font-medium">
              {billingPeriod === 'monthly' ? 'R$ 14,90/mês' : 'R$ 148,40/ano'}
            </span>
          </button>
          
          <button
            onClick={() => setSelectedPlan('super')}
            className={`p-3 rounded-xl border-2 ${
              selectedPlan === 'super' ? 'border-yellow-500 bg-kairo-surface-2' : 'border-border bg-kairo-surface-2'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="px-2 py-0.5 rounded bg-yellow-500 text-black text-xs font-bold">SUPER</span>
              {selectedPlan === 'super' && <Check className="w-4 h-4 text-yellow-500" />}
            </div>
            <span className="text-foreground text-sm font-medium">
              {billingPeriod === 'monthly' ? 'R$ 29,90/mês' : 'R$ 297,80/ano'}
            </span>
          </button>
        </div>
        
        <button className="w-full py-4 rounded-2xl bg-foreground text-background font-semibold text-lg">
          Experimente grátis por 7 dias
        </button>
        
        <button className="w-full text-center text-muted-foreground text-sm py-3 hover:text-foreground transition-colors">
          Restaurar compras
        </button>
      </div>
    </div>
  );
};

export default MyPlanPage;
