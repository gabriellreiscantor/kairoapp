import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type LanguageCode = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'it-IT' | 'ja-JP' | 'ko-KR' | 'zh-CN';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations
const translations: Record<LanguageCode, Record<string, string>> = {
  'pt-BR': {
    // Navigation
    'nav.chat': 'Chat',
    'nav.list': 'Lista',
    'nav.calendar': 'Calendário',
    
    // Common
    'common.back': 'Voltar',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.loading': 'Carregando...',
    
    // Settings
    'settings.title': 'Configurações',
    'settings.myPlan': 'Meu plano',
    'settings.calendars': 'Calendários',
    'settings.notifications': 'Notificações',
    'settings.smartTasks': 'Tarefas Inteligentes',
    'settings.specialFeatures': 'Recursos Especiais',
    'settings.account': 'Conta',
    'settings.appearance': 'Aparência',
    'settings.language': 'Idioma',
    'settings.feedback': 'Comentários',
    'settings.about': 'Sobre',
    'settings.logout': 'Sair',
    'settings.kairo': 'KAIRO',
    'settings.general': 'GERAL',
    'settings.others': 'OUTROS',
    
    // Language page
    'language.title': 'Idioma',
    'language.search': 'Buscar idioma...',
    'language.note': 'O idioma será aplicado a toda a interface do Kairo. Algumas traduções podem estar incompletas.',
    
    // My Plan page
    'plan.title': 'Meu plano',
    'plan.free': 'Grátis',
    'plan.plus': 'PLUS',
    'plan.super': 'SUPER',
    'plan.premium': 'Planos Kairo Premium',
    'plan.tryFree': 'Experimente grátis por 7 dias',
    'plan.eventsScheduled': 'Eventos agendados',
    'plan.upgradeNow': 'Atualizar agora',
    'plan.monthly': 'Mensal',
    'plan.yearly': 'Anual',
    'plan.saveYearly': 'Economize 17% com a cobrança anual',
    'plan.features': 'Recursos Premium',
    'plan.faq': 'Perguntas e Respostas',
    'plan.terms': 'Termos de Serviço',
    'plan.privacy': 'Política de Privacidade',
    'plan.manageSubscription': 'Gerenciar assinatura e pagamentos',
    'plan.restorePurchases': 'Restaurar compras',
    
    // Chat
    'chat.placeholder': 'Escreva uma mensagem...',
    'chat.greeting': 'Olá! Como posso ajudar você hoje?',
    
    // Calendar
    'calendar.today': 'Hoje',
    'calendar.tomorrow': 'Amanhã',
    'calendar.noEvents': 'Nenhum evento',
    
    // About
    'about.title': 'Sobre',
    'about.terms': 'Termos de Serviço',
    'about.privacy': 'Política de Privacidade',
    'about.faq': 'Perguntas Frequentes',
    'about.version': 'Versão',
  },
  'en-US': {
    // Navigation
    'nav.chat': 'Chat',
    'nav.list': 'List',
    'nav.calendar': 'Calendar',
    
    // Common
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    
    // Settings
    'settings.title': 'Settings',
    'settings.myPlan': 'My Plan',
    'settings.calendars': 'Calendars',
    'settings.notifications': 'Notifications',
    'settings.smartTasks': 'Smart Tasks',
    'settings.specialFeatures': 'Special Features',
    'settings.account': 'Account',
    'settings.appearance': 'Appearance',
    'settings.language': 'Language',
    'settings.feedback': 'Feedback',
    'settings.about': 'About',
    'settings.logout': 'Log out',
    'settings.kairo': 'KAIRO',
    'settings.general': 'GENERAL',
    'settings.others': 'OTHERS',
    
    // Language page
    'language.title': 'Language',
    'language.search': 'Search language...',
    'language.note': 'The language will be applied to the entire Kairo interface. Some translations may be incomplete.',
    
    // My Plan page
    'plan.title': 'My Plan',
    'plan.free': 'Free',
    'plan.plus': 'PLUS',
    'plan.super': 'SUPER',
    'plan.premium': 'Kairo Premium Plans',
    'plan.tryFree': 'Try free for 7 days',
    'plan.eventsScheduled': 'Events scheduled',
    'plan.upgradeNow': 'Upgrade now',
    'plan.monthly': 'Monthly',
    'plan.yearly': 'Yearly',
    'plan.saveYearly': 'Save 17% with annual billing',
    'plan.features': 'Premium Features',
    'plan.faq': 'Questions and Answers',
    'plan.terms': 'Terms of Service',
    'plan.privacy': 'Privacy Policy',
    'plan.manageSubscription': 'Manage subscription and payments',
    'plan.restorePurchases': 'Restore purchases',
    
    // Chat
    'chat.placeholder': 'Write a message...',
    'chat.greeting': 'Hello! How can I help you today?',
    
    // Calendar
    'calendar.today': 'Today',
    'calendar.tomorrow': 'Tomorrow',
    'calendar.noEvents': 'No events',
    
    // About
    'about.title': 'About',
    'about.terms': 'Terms of Service',
    'about.privacy': 'Privacy Policy',
    'about.faq': 'Frequently Asked Questions',
    'about.version': 'Version',
  },
  'es-ES': {
    // Navigation
    'nav.chat': 'Chat',
    'nav.list': 'Lista',
    'nav.calendar': 'Calendario',
    
    // Common
    'common.back': 'Volver',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.myPlan': 'Mi plan',
    'settings.calendars': 'Calendarios',
    'settings.notifications': 'Notificaciones',
    'settings.smartTasks': 'Tareas Inteligentes',
    'settings.specialFeatures': 'Funciones Especiales',
    'settings.account': 'Cuenta',
    'settings.appearance': 'Apariencia',
    'settings.language': 'Idioma',
    'settings.feedback': 'Comentarios',
    'settings.about': 'Acerca de',
    'settings.logout': 'Cerrar sesión',
    'settings.kairo': 'KAIRO',
    'settings.general': 'GENERAL',
    'settings.others': 'OTROS',
    
    // Language page
    'language.title': 'Idioma',
    'language.search': 'Buscar idioma...',
    'language.note': 'El idioma se aplicará a toda la interfaz de Kairo. Algunas traducciones pueden estar incompletas.',
    
    // My Plan page
    'plan.title': 'Mi plan',
    'plan.free': 'Gratis',
    'plan.plus': 'PLUS',
    'plan.super': 'SUPER',
    'plan.premium': 'Planes Kairo Premium',
    'plan.tryFree': 'Prueba gratis por 7 días',
    'plan.eventsScheduled': 'Eventos programados',
    'plan.upgradeNow': 'Actualizar ahora',
    'plan.monthly': 'Mensual',
    'plan.yearly': 'Anual',
    'plan.saveYearly': 'Ahorra 17% con facturación anual',
    'plan.features': 'Funciones Premium',
    'plan.faq': 'Preguntas y Respuestas',
    'plan.terms': 'Términos de Servicio',
    'plan.privacy': 'Política de Privacidad',
    'plan.manageSubscription': 'Gestionar suscripción y pagos',
    'plan.restorePurchases': 'Restaurar compras',
    
    // Chat
    'chat.placeholder': 'Escribe un mensaje...',
    'chat.greeting': '¡Hola! ¿Cómo puedo ayudarte hoy?',
    
    // Calendar
    'calendar.today': 'Hoy',
    'calendar.tomorrow': 'Mañana',
    'calendar.noEvents': 'Sin eventos',
    
    // About
    'about.title': 'Acerca de',
    'about.terms': 'Términos de Servicio',
    'about.privacy': 'Política de Privacidad',
    'about.faq': 'Preguntas Frecuentes',
    'about.version': 'Versión',
  },
  'fr-FR': {
    'nav.chat': 'Chat',
    'nav.list': 'Liste',
    'nav.calendar': 'Calendrier',
    'common.back': 'Retour',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'settings.title': 'Paramètres',
    'settings.myPlan': 'Mon forfait',
    'settings.calendars': 'Calendriers',
    'settings.notifications': 'Notifications',
    'settings.smartTasks': 'Tâches Intelligentes',
    'settings.specialFeatures': 'Fonctionnalités Spéciales',
    'settings.account': 'Compte',
    'settings.appearance': 'Apparence',
    'settings.language': 'Langue',
    'settings.feedback': 'Commentaires',
    'settings.about': 'À propos',
    'settings.logout': 'Déconnexion',
    'settings.kairo': 'KAIRO',
    'settings.general': 'GÉNÉRAL',
    'settings.others': 'AUTRES',
    'language.title': 'Langue',
    'language.search': 'Rechercher une langue...',
    'language.note': 'La langue sera appliquée à toute l\'interface Kairo.',
    'plan.title': 'Mon forfait',
    'plan.free': 'Gratuit',
    'plan.tryFree': 'Essayez gratuitement pendant 7 jours',
    'chat.placeholder': 'Écrivez un message...',
    'chat.greeting': 'Bonjour ! Comment puis-je vous aider ?',
    'calendar.today': 'Aujourd\'hui',
    'calendar.tomorrow': 'Demain',
    'calendar.noEvents': 'Aucun événement',
    'about.title': 'À propos',
    'about.version': 'Version',
  },
  'de-DE': {
    'nav.chat': 'Chat',
    'nav.list': 'Liste',
    'nav.calendar': 'Kalender',
    'common.back': 'Zurück',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.search': 'Suchen',
    'common.loading': 'Laden...',
    'settings.title': 'Einstellungen',
    'settings.myPlan': 'Mein Plan',
    'settings.language': 'Sprache',
    'settings.about': 'Über',
    'settings.logout': 'Abmelden',
    'language.title': 'Sprache',
    'language.search': 'Sprache suchen...',
    'plan.title': 'Mein Plan',
    'plan.free': 'Kostenlos',
    'chat.placeholder': 'Nachricht schreiben...',
    'calendar.today': 'Heute',
    'calendar.tomorrow': 'Morgen',
    'about.title': 'Über',
    'about.version': 'Version',
  },
  'it-IT': {
    'nav.chat': 'Chat',
    'nav.list': 'Lista',
    'nav.calendar': 'Calendario',
    'common.back': 'Indietro',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.search': 'Cerca',
    'settings.title': 'Impostazioni',
    'settings.myPlan': 'Il mio piano',
    'settings.language': 'Lingua',
    'settings.about': 'Informazioni',
    'settings.logout': 'Esci',
    'language.title': 'Lingua',
    'language.search': 'Cerca lingua...',
    'plan.title': 'Il mio piano',
    'plan.free': 'Gratuito',
    'chat.placeholder': 'Scrivi un messaggio...',
    'calendar.today': 'Oggi',
    'calendar.tomorrow': 'Domani',
    'about.title': 'Informazioni',
  },
  'ja-JP': {
    'nav.chat': 'チャット',
    'nav.list': 'リスト',
    'nav.calendar': 'カレンダー',
    'common.back': '戻る',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.search': '検索',
    'settings.title': '設定',
    'settings.myPlan': 'マイプラン',
    'settings.language': '言語',
    'settings.about': '概要',
    'settings.logout': 'ログアウト',
    'language.title': '言語',
    'language.search': '言語を検索...',
    'plan.title': 'マイプラン',
    'plan.free': '無料',
    'chat.placeholder': 'メッセージを入力...',
    'calendar.today': '今日',
    'calendar.tomorrow': '明日',
    'about.title': '概要',
  },
  'ko-KR': {
    'nav.chat': '채팅',
    'nav.list': '목록',
    'nav.calendar': '캘린더',
    'common.back': '뒤로',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.search': '검색',
    'settings.title': '설정',
    'settings.myPlan': '내 플랜',
    'settings.language': '언어',
    'settings.about': '정보',
    'settings.logout': '로그아웃',
    'language.title': '언어',
    'language.search': '언어 검색...',
    'plan.title': '내 플랜',
    'plan.free': '무료',
    'chat.placeholder': '메시지 입력...',
    'calendar.today': '오늘',
    'calendar.tomorrow': '내일',
    'about.title': '정보',
  },
  'zh-CN': {
    'nav.chat': '聊天',
    'nav.list': '列表',
    'nav.calendar': '日历',
    'common.back': '返回',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.search': '搜索',
    'settings.title': '设置',
    'settings.myPlan': '我的计划',
    'settings.language': '语言',
    'settings.about': '关于',
    'settings.logout': '退出',
    'language.title': '语言',
    'language.search': '搜索语言...',
    'plan.title': '我的计划',
    'plan.free': '免费',
    'chat.placeholder': '输入消息...',
    'calendar.today': '今天',
    'calendar.tomorrow': '明天',
    'about.title': '关于',
  },
};

// Detect device language
const detectDeviceLanguage = (): LanguageCode => {
  const savedLanguage = localStorage.getItem('kairo-language') as LanguageCode;
  if (savedLanguage && translations[savedLanguage]) {
    return savedLanguage;
  }
  
  // Get browser/device language
  const browserLang = navigator.language || (navigator as any).userLanguage;
  
  // Try exact match first
  if (translations[browserLang as LanguageCode]) {
    return browserLang as LanguageCode;
  }
  
  // Try matching just the language code (e.g., 'en' from 'en-GB')
  const langCode = browserLang.split('-')[0];
  const matchingLang = Object.keys(translations).find(key => 
    key.startsWith(langCode)
  ) as LanguageCode;
  
  if (matchingLang) {
    return matchingLang;
  }
  
  // Default to Portuguese (Brazil)
  return 'pt-BR';
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => detectDeviceLanguage());

  useEffect(() => {
    // Update HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('kairo-language', lang);
    document.documentElement.lang = lang;
  };

  const t = (key: string): string => {
    const langTranslations = translations[language];
    if (langTranslations && langTranslations[key]) {
      return langTranslations[key];
    }
    
    // Fallback to Portuguese
    const fallback = translations['pt-BR'][key];
    if (fallback) {
      return fallback;
    }
    
    // Return key if no translation found
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export { translations };
