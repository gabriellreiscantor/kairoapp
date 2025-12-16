import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ptBR, enUS, es, fr, de, it, ja, ko, zhCN, Locale } from "date-fns/locale";

export type LanguageCode = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'it-IT' | 'ja-JP' | 'ko-KR' | 'zh-CN';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  getDateLocale: () => Locale;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Date-fns locale mapping
const DATE_LOCALES: Record<LanguageCode, Locale> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': es,
  'fr-FR': fr,
  'de-DE': de,
  'it-IT': it,
  'ja-JP': ja,
  'ko-KR': ko,
  'zh-CN': zhCN,
};

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
    'settings.smartTasks': 'Ações Inteligentes',
    'settings.specialFeatures': 'Recursos Premium',
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
    'chat.greeting': 'Olá! Toque em qualquer exemplo abaixo para criar um compromisso rapidamente.',
    'chat.today': 'Hoje',
    'chat.yesterday': 'Ontem',
    'chat.errorConnect': 'Falha ao conectar com a IA',
    'chat.suggestion1': 'Organizar um churrasco com os amigos neste sábado às 13h.',
    'chat.suggestion2': 'Consulta médica na quarta-feira às 9h.',
    'chat.suggestion3': 'Café com a Sofia amanhã às 16h na padaria.',
    'chat.suggestion4': 'Comprar ingressos para o jogo neste fim de semana.',
    
    // Calendar
    'calendar.today': 'Hoje',
    'calendar.tomorrow': 'Amanhã',
    'calendar.noEvents': 'Nenhum evento',
    'calendar.todayIs': 'hoje é dia',
    'calendar.allDay': 'Dia inteiro',
    'calendar.weekdaySun': 'D',
    'calendar.weekdayMon': 'S',
    'calendar.weekdayTue': 'T',
    'calendar.weekdayWed': 'Q',
    'calendar.weekdayThu': 'Q',
    'calendar.weekdayFri': 'S',
    'calendar.weekdaySat': 'S',
    
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
    'chat.greeting': 'Hello! Tap any example below to quickly create an appointment.',
    'chat.today': 'Today',
    'chat.yesterday': 'Yesterday',
    'chat.errorConnect': 'Failed to connect to AI',
    'chat.suggestion1': 'Organize a barbecue with friends this Saturday at 1pm.',
    'chat.suggestion2': 'Doctor appointment on Wednesday at 9am.',
    'chat.suggestion3': 'Coffee with Sofia tomorrow at 4pm at the bakery.',
    'chat.suggestion4': 'Buy tickets for the game this weekend.',
    
    // Calendar
    'calendar.today': 'Today',
    'calendar.tomorrow': 'Tomorrow',
    'calendar.noEvents': 'No events',
    'calendar.todayIs': 'today is',
    'calendar.allDay': 'All day',
    'calendar.weekdaySun': 'S',
    'calendar.weekdayMon': 'M',
    'calendar.weekdayTue': 'T',
    'calendar.weekdayWed': 'W',
    'calendar.weekdayThu': 'T',
    'calendar.weekdayFri': 'F',
    'calendar.weekdaySat': 'S',
    
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
    'chat.greeting': '¡Hola! Toca cualquier ejemplo abajo para crear una cita rápidamente.',
    'chat.today': 'Hoy',
    'chat.yesterday': 'Ayer',
    'chat.errorConnect': 'Error al conectar con la IA',
    'chat.suggestion1': 'Organizar una parrillada con amigos este sábado a las 13h.',
    'chat.suggestion2': 'Cita médica el miércoles a las 9h.',
    'chat.suggestion3': 'Café con Sofía mañana a las 16h en la panadería.',
    'chat.suggestion4': 'Comprar entradas para el partido este fin de semana.',
    
    // Calendar
    'calendar.today': 'Hoy',
    'calendar.tomorrow': 'Mañana',
    'calendar.noEvents': 'Sin eventos',
    'calendar.todayIs': 'hoy es',
    'calendar.allDay': 'Todo el día',
    'calendar.weekdaySun': 'D',
    'calendar.weekdayMon': 'L',
    'calendar.weekdayTue': 'M',
    'calendar.weekdayWed': 'X',
    'calendar.weekdayThu': 'J',
    'calendar.weekdayFri': 'V',
    'calendar.weekdaySat': 'S',
    
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
    'chat.greeting': 'Bonjour ! Touchez un exemple ci-dessous pour créer rapidement un rendez-vous.',
    'chat.today': 'Aujourd\'hui',
    'chat.yesterday': 'Hier',
    'chat.errorConnect': 'Échec de la connexion à l\'IA',
    'chat.suggestion1': 'Organiser un barbecue avec des amis ce samedi à 13h.',
    'chat.suggestion2': 'Rendez-vous médical mercredi à 9h.',
    'chat.suggestion3': 'Café avec Sofia demain à 16h à la boulangerie.',
    'chat.suggestion4': 'Acheter des billets pour le match ce week-end.',
    'calendar.today': 'Aujourd\'hui',
    'calendar.tomorrow': 'Demain',
    'calendar.noEvents': 'Aucun événement',
    'calendar.todayIs': 'aujourd\'hui c\'est le',
    'calendar.allDay': 'Toute la journée',
    'calendar.weekdaySun': 'D',
    'calendar.weekdayMon': 'L',
    'calendar.weekdayTue': 'M',
    'calendar.weekdayWed': 'M',
    'calendar.weekdayThu': 'J',
    'calendar.weekdayFri': 'V',
    'calendar.weekdaySat': 'S',
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
    'chat.greeting': 'Hallo! Tippen Sie auf ein Beispiel unten, um schnell einen Termin zu erstellen.',
    'chat.today': 'Heute',
    'chat.yesterday': 'Gestern',
    'chat.errorConnect': 'Verbindung zur KI fehlgeschlagen',
    'chat.suggestion1': 'Grillfest mit Freunden diesen Samstag um 13 Uhr organisieren.',
    'chat.suggestion2': 'Arzttermin am Mittwoch um 9 Uhr.',
    'chat.suggestion3': 'Kaffee mit Sofia morgen um 16 Uhr in der Bäckerei.',
    'chat.suggestion4': 'Tickets für das Spiel am Wochenende kaufen.',
    'calendar.today': 'Heute',
    'calendar.tomorrow': 'Morgen',
    'calendar.todayIs': 'heute ist der',
    'calendar.allDay': 'Ganztägig',
    'calendar.weekdaySun': 'S',
    'calendar.weekdayMon': 'M',
    'calendar.weekdayTue': 'D',
    'calendar.weekdayWed': 'M',
    'calendar.weekdayThu': 'D',
    'calendar.weekdayFri': 'F',
    'calendar.weekdaySat': 'S',
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
    'chat.greeting': 'Ciao! Tocca un esempio qui sotto per creare rapidamente un appuntamento.',
    'chat.today': 'Oggi',
    'chat.yesterday': 'Ieri',
    'chat.errorConnect': 'Connessione all\'IA fallita',
    'chat.suggestion1': 'Organizzare un barbecue con amici sabato alle 13.',
    'chat.suggestion2': 'Appuntamento dal medico mercoledì alle 9.',
    'chat.suggestion3': 'Caffè con Sofia domani alle 16 in panetteria.',
    'chat.suggestion4': 'Comprare biglietti per la partita questo fine settimana.',
    'calendar.today': 'Oggi',
    'calendar.tomorrow': 'Domani',
    'calendar.todayIs': 'oggi è il',
    'calendar.allDay': 'Tutto il giorno',
    'calendar.weekdaySun': 'D',
    'calendar.weekdayMon': 'L',
    'calendar.weekdayTue': 'M',
    'calendar.weekdayWed': 'M',
    'calendar.weekdayThu': 'G',
    'calendar.weekdayFri': 'V',
    'calendar.weekdaySat': 'S',
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
    'chat.greeting': 'こんにちは！下の例をタップして、すぐに予定を作成できます。',
    'chat.today': '今日',
    'chat.yesterday': '昨日',
    'chat.errorConnect': 'AIへの接続に失敗しました',
    'chat.suggestion1': '今週土曜日の13時に友人とバーベキューを企画する。',
    'chat.suggestion2': '水曜日の9時に医者の予約。',
    'chat.suggestion3': '明日の16時にパン屋でソフィアとコーヒー。',
    'chat.suggestion4': '今週末の試合のチケットを買う。',
    'calendar.today': '今日',
    'calendar.tomorrow': '明日',
    'calendar.todayIs': '今日は',
    'calendar.allDay': '終日',
    'calendar.weekdaySun': '日',
    'calendar.weekdayMon': '月',
    'calendar.weekdayTue': '火',
    'calendar.weekdayWed': '水',
    'calendar.weekdayThu': '木',
    'calendar.weekdayFri': '金',
    'calendar.weekdaySat': '土',
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
    'chat.greeting': '안녕하세요! 아래 예시를 탭하여 빠르게 일정을 만드세요.',
    'chat.today': '오늘',
    'chat.yesterday': '어제',
    'chat.errorConnect': 'AI 연결에 실패했습니다',
    'chat.suggestion1': '이번 주 토요일 오후 1시에 친구들과 바비큐 파티 준비하기.',
    'chat.suggestion2': '수요일 오전 9시 병원 예약.',
    'chat.suggestion3': '내일 오후 4시에 빵집에서 소피아와 커피.',
    'chat.suggestion4': '이번 주말 경기 티켓 구매하기.',
    'calendar.today': '오늘',
    'calendar.tomorrow': '내일',
    'calendar.todayIs': '오늘은',
    'calendar.allDay': '종일',
    'calendar.weekdaySun': '일',
    'calendar.weekdayMon': '월',
    'calendar.weekdayTue': '화',
    'calendar.weekdayWed': '수',
    'calendar.weekdayThu': '목',
    'calendar.weekdayFri': '금',
    'calendar.weekdaySat': '토',
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
    'chat.greeting': '你好！点击下面的示例快速创建日程。',
    'chat.today': '今天',
    'chat.yesterday': '昨天',
    'chat.errorConnect': '连接AI失败',
    'chat.suggestion1': '本周六下午1点和朋友们组织烧烤。',
    'chat.suggestion2': '周三上午9点看医生。',
    'chat.suggestion3': '明天下午4点在面包店和索菲亚喝咖啡。',
    'chat.suggestion4': '买这个周末比赛的门票。',
    'calendar.today': '今天',
    'calendar.tomorrow': '明天',
    'calendar.todayIs': '今天是',
    'calendar.allDay': '全天',
    'calendar.weekdaySun': '日',
    'calendar.weekdayMon': '一',
    'calendar.weekdayTue': '二',
    'calendar.weekdayWed': '三',
    'calendar.weekdayThu': '四',
    'calendar.weekdayFri': '五',
    'calendar.weekdaySat': '六',
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

  const getDateLocale = (): Locale => {
    return DATE_LOCALES[language] || ptBR;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getDateLocale }}>
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
