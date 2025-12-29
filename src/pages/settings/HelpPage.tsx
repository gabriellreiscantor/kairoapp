import { ChevronRight, MessageCircle, Mail, Book, Video, ExternalLink, HelpCircle, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import horahLogo from "@/assets/horah-logo.png";
import BackButton from "@/components/BackButton";
import { useLanguage } from "@/contexts/LanguageContext";

const HelpPage = () => {
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const { t } = useLanguage();
  
  const isPremium = subscription?.plan === 'plus' || subscription?.plan === 'super';

  // Dynamic FAQ based on current language
  const FAQ = [
    {
      question: t('help.faqWhatsapp'),
      answer: t('help.faqWhatsappAnswer'),
    },
    {
      question: t('help.faqCallMe'),
      answer: t('help.faqCallMeAnswer'),
    },
    {
      question: t('help.faqCritical'),
      answer: t('help.faqCriticalAnswer'),
    },
    {
      question: t('help.faqSync'),
      answer: t('help.faqSyncAnswer'),
    },
    {
      question: t('help.faqCancelIos'),
      answer: t('help.faqCancelIosAnswer'),
    },
    {
      question: t('help.faqCancelAndroid'),
      answer: t('help.faqCancelAndroidAnswer'),
    },
    {
      question: t('help.faqPlans'),
      answer: t('help.faqPlansAnswer'),
    },
    {
      question: t('help.faqOffline'),
      answer: t('help.faqOfflineAnswer'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{t('help.title')}</h1>
        </div>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl p-6 text-center">
          <img 
            src={horahLogo} 
            alt="Horah" 
            className="w-16 h-16 mx-auto mb-4 rounded-full object-cover"
          />
          <h2 className="text-lg font-semibold text-foreground mb-2">{t('help.howCanWeHelp')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('help.subtitle')}
          </p>
        </div>

        {/* Contact Support */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 px-1 font-medium">
            {t('help.contactUs')}
          </h2>
          <div className="space-y-3">
            {/* Live Chat - Premium Only */}
            {isPremium ? (
              <button className="w-full bg-gradient-to-r from-kairo-green/20 to-kairo-green/10 border border-kairo-green/30 rounded-2xl p-4 flex items-center justify-between group hover:from-kairo-green/30 hover:to-kairo-green/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-kairo-green/20 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-kairo-green" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium">{t('help.liveChat')}</p>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-kairo-green/20 text-kairo-green rounded-full">
                        {t('help.liveChatPremium')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('help.liveChatDesc')}</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-kairo-green/20 flex items-center justify-center group-hover:bg-kairo-green/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-kairo-green" />
                </div>
              </button>
            ) : (
              <div className="relative bg-kairo-surface-2 rounded-2xl p-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-kairo-surface-3 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-medium">{t('help.liveChat')}</p>
                        <Crown className="w-4 h-4 text-kairo-amber" />
                      </div>
                      <p className="text-xs text-muted-foreground">{t('help.liveChatExclusive')}</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/settings/my-plan')}
                  className="mt-3 w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  {t('common.upgrade')}
                </button>
              </div>
            )}

            {/* Email - Available for all */}
            <a 
              href="mailto:contato@horah.app?subject=Ajuda%20-%20Horah%20App"
              className="w-full bg-kairo-surface-2 rounded-2xl p-4 flex items-center justify-between group hover:bg-kairo-surface-3 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-foreground font-medium">{t('help.email')}</p>
                  <p className="text-xs text-muted-foreground">contato@horah.app</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
            </a>
          </div>
        </div>

        {/* Resources */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 px-1 font-medium">
            {t('help.resources')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-kairo-surface-2 rounded-2xl p-4 flex flex-col items-center gap-3 hover:bg-kairo-surface-3 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-kairo-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Book className="w-6 h-6 text-kairo-blue" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium text-sm">{t('help.userGuide')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('help.documentation')}</p>
              </div>
            </button>
            <button className="bg-kairo-surface-2 rounded-2xl p-4 flex flex-col items-center gap-3 hover:bg-kairo-surface-3 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-kairo-purple/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-kairo-purple" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium text-sm">{t('help.tutorials')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('help.videos')}</p>
              </div>
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 px-1 font-medium">
            {t('help.faq')}
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, index) => (
              <details 
                key={index} 
                className="bg-kairo-surface-2 rounded-2xl overflow-hidden group"
              >
                <summary className="px-4 py-4 cursor-pointer flex items-center justify-between list-none">
                  <h3 className="text-foreground font-medium text-sm pr-4">{item.question}</h3>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            {t('help.notFound')}
          </p>
          <a 
            href="mailto:contato@horah.app?subject=Dúvida%20-%20Horah%20App"
            className="text-primary text-sm font-medium mt-1 hover:underline"
          >
            {t('help.sendQuestion')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;