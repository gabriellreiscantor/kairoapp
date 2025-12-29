import { useState, useRef, useEffect } from "react";
import { Camera, Image, Mic, Send, Calendar as CalendarIcon, User, Loader2, ChevronDown, History } from "lucide-react";
import { format, isToday, isYesterday, differenceInMinutes, startOfDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useImageCapture } from "@/hooks/useImageCapture";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getOrCreateDeviceId } from "@/hooks/useDeviceId";
import horahHeader from "@/assets/horah-header.png";
import horahHeaderDark from "@/assets/horah-logo-dark.png";
import horahAvatar from "@/assets/horah-logo-light.png";
import horahAvatarDark from "@/assets/horah-avatar-dark.png";
import EventCreatedCard from "@/components/chat/EventCreatedCard";
import EventDeletedCard from "@/components/chat/EventDeletedCard";
import EventCreatingAnimation from "@/components/chat/EventCreatingAnimation";
import PastDateCard from "@/components/chat/PastDateCard";
import EventConfirmationModal from "@/components/chat/EventConfirmationModal";
import EventConfirmationCard from "@/components/chat/EventConfirmationCard";
import OnboardingSuggestionCard from "@/components/chat/OnboardingSuggestionCard";
import EventListCard from "@/components/chat/EventListCard";
import WeeklyReportCard from "@/components/chat/WeeklyReportCard";
import WeeklyReportNotReadyCard from "@/components/chat/WeeklyReportNotReadyCard";
import WeeklyReportModal from "@/components/chat/WeeklyReportModal";
import WeatherForecastCard from "@/components/chat/WeatherForecastCard";
import WeatherForecastModal from "@/components/chat/WeatherForecastModal";
import EditEventModal from "@/components/EditEventModal";
import AudioRecordingOverlay from "@/components/chat/AudioRecordingOverlay";
import CallNotificationCard from "@/components/chat/CallNotificationCard";
import PushNotificationCard from "@/components/chat/PushNotificationCard";
import UpgradePlanCard from "@/components/chat/UpgradePlanCard";

type ViewType = 'chat' | 'list' | 'calendar';

interface ChatPageProps {
  onNavigateToCalendar: () => void;
  onOpenSettings: () => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onEventCreated?: () => void;
  initialEditMessage?: { eventId: string; message: string } | null;
  onClearInitialEditMessage?: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  actions?: ExecutedAction[];
  imagePreview?: string;
  eventData?: any; // For showing event cards
  deletedEventData?: any; // For showing deleted event cards
  isCreatingEvent?: boolean; // For showing creation animation
  suggestionCard?: 'weekly_planning' | 'connect_calendar'; // For onboarding suggestions
  eventsListData?: Array<{ // For showing list of events
    id: string;
    titulo: string;
    data: string;
    hora?: string;
    local?: string;
    prioridade?: string;
    categoria?: string;
  }>;
  confirmationData?: { // For showing confirmation card in chat
    titulo: string;
    data: string;
    hora: string;
    local: string;
    notificacao: string;
  };
  pendingImageEvent?: any; // For storing image analysis event data to create when user confirms
  pastDateData?: { // For showing past date warning card
    titulo: string;
    data: string;
    hora?: string;
    local?: string;
  };
  weeklyReportData?: { // For showing weekly report card
    report: any;
    isPreviousWeek: boolean;
  };
  weeklyReportNotReady?: { // For showing "report not ready" card
    daysRemaining: number;
  };
  weatherData?: any; // For showing weather forecast card
  callNotificationData?: { // For showing call notification card (native VoIP only)
    eventId: string;
    eventTitle: string;
    eventTime: string;
    callSentAt: string;
    answered?: boolean;
  };
  pushNotificationData?: { // For showing push notification card (regular push fallback)
    eventId: string;
    eventTitle: string;
    eventTime: string;
    notificationSentAt: string;
  };
  limitReachedData?: { // For showing upgrade plan card when limit is reached
    currentPlan: string;
    eventsUsed: number;
    eventsLimit: number;
    daysUntilReset: number;
  };
}

interface ExecutedAction {
  action: string;
  success: boolean;
  data?: any;
  error?: string;
  eventId?: string; // CRITICAL: Explicit event ID for verification
  eventData?: any; // Full event data from image analysis
  resumo_evento?: {
    titulo: string;
    data: string;
    hora: string;
    local: string;
    notificacao: string;
  };
  evento_atualizado?: any; // Full updated event in Supabase format
  evento_deletado?: any; // Full deleted event in Supabase format
  eventos?: Array<{
    id: string;
    titulo: string;
    data: string;
    hora?: string;
    local?: string;
    prioridade?: string;
    categoria?: string;
  }>;
  weeklyReportData?: { // Weekly report data
    report: any;
    isPreviousWeek: boolean;
  };
  weeklyReportNotReady?: { // Weekly report not ready data
    daysRemaining: number;
  };
  weatherData?: any; // Weather forecast data
  limitReached?: boolean; // Limit reached flag
  limitData?: { // Limit data for UpgradePlanCard
    currentPlan: string;
    eventsUsed: number;
    eventsLimit: number;
    daysUntilReset: number;
  };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TRANSCRIBE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;
const ANALYZE_IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`;

// Onboarding messages
const ONBOARDING_WELCOME = `Estou aqui para te ajudar a criar seu primeiro lembrete ou compromisso.

Assim você não precisa guardar tudo na cabeça.

Pode ser qualquer coisa — me conta o que você gostaria de lembrar.`;

const ONBOARDING_FIRST_EVENT_SUCCESS = `Excelente! Você acabou de criar seu primeiro lembrete no Horah.

A partir de agora, o Horah cuida disso pra você.`;

const ChatPage = ({ onNavigateToCalendar, onOpenSettings, activeView, onViewChange, onEventCreated, initialEditMessage, onClearInitialEditMessage }: ChatPageProps) => {
  const { user, session } = useAuth();
  const { resolvedTheme } = useTheme();
  const { t, getDateLocale, language } = useLanguage();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { captureFromCamera, selectFromGallery } = useImageCapture();
  const { 
    step: onboardingStep, 
    isInOnboarding, 
    isLoading: isOnboardingLoading,
    setStep: setOnboardingStep,
    markFirstEventCreated,
    completeOnboarding 
  } = useOnboarding();
  
  // Header image (colorful octopus) and avatar image (transparent) are now separate
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [showWeeklySuggestion, setShowWeeklySuggestion] = useState(false);
  const [showCalendarSuggestion, setShowCalendarSuggestion] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    resumo: { titulo: string; data: string; hora: string; local: string; notificacao: string } | null;
    messageId: string | null;
  }>({ isOpen: false, resumo: null, messageId: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Infinite pagination state (WhatsApp style)
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Show only today's messages by default, with option to load full history
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{
    id: string;
    title: string;
    event_date: string;
    event_time: string | null;
    location: string | null;
    description: string | null;
    priority: string | null;
    notification_enabled: boolean | null;
    call_alert_enabled: boolean | null;
    category: string | null;
    status: string | null;
  } | null>(null);
  const [selectedWeeklyReport, setSelectedWeeklyReport] = useState<any | null>(null);
  const [selectedWeatherForecast, setSelectedWeatherForecast] = useState<any | null>(null);
  const dateLocale = getDateLocale();

  // Get user display name for personalized messages
  const [displayName, setDisplayName] = useState<string>('');
  
  // Device ID for VoIP push (device-centric architecture)
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Load device ID on mount
  useEffect(() => {
    const loadDeviceId = async () => {
      const id = await getOrCreateDeviceId();
      setDeviceId(id);
      console.log('[ChatPage] Device ID loaded:', id.substring(0, 8) + '...');
    };
    loadDeviceId();
  }, []);
  
  useEffect(() => {
    const loadDisplayName = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
      } catch (error) {
        console.error('Error loading display name:', error);
      }
    };
    loadDisplayName();
  }, [user]);

  const suggestions = isInOnboarding ? [
    { emoji: "🦷", text: "Lembrar de escovar os dentes às 22h" },
    { emoji: "💊", text: "Tomar remédio todo dia às 8h" },
    { emoji: "📞", text: "Ligar para minha mãe domingo" },
    { emoji: "🏃", text: "Academia amanhã às 7h" },
  ] : [
    { emoji: "🍖", text: t('chat.suggestion1') },
    { emoji: "🩺", text: t('chat.suggestion2') },
    { emoji: "☕", text: t('chat.suggestion3') },
    { emoji: "🏆", text: t('chat.suggestion4') },
  ];

  const formatMessageTime = (date: Date): string => {
    const time = format(date, 'HH:mm');
    
    if (isToday(date)) {
      return `${t('chat.today')} ${time}`;
    } else if (isYesterday(date)) {
      return `${t('chat.yesterday')} ${time}`;
    } else {
      return format(date, "d MMM HH:mm", { locale: dateLocale });
    }
  };

  const shouldShowTimestamp = (currentMsg: Message, prevMsg: Message | null): boolean => {
    if (!prevMsg) return true;
    const minutesDiff = differenceInMinutes(currentMsg.createdAt, prevMsg.createdAt);
    return minutesDiff >= 5 || currentMsg.type !== prevMsg.type;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showWeeklySuggestion, showCalendarSuggestion]);

  // Ensure typing indicator is visible when loading starts
  useEffect(() => {
    if (isLoading) {
      scrollToBottom();
    }
  }, [isLoading]);

  // Scroll to bottom when returning to chat view OR when initial load completes
  useEffect(() => {
    if (activeView === 'chat' && !isLoadingHistory && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  }, [activeView, isLoadingHistory, messages.length]);

  // State for pending edit message from EventDetailPage
  const [pendingEditMessage, setPendingEditMessage] = useState<string | null>(null);

  // Handle initial edit message from EventDetailPage
  useEffect(() => {
    if (initialEditMessage && activeView === 'chat' && !isLoadingHistory) {
      const { eventId, message } = initialEditMessage;
      // Set the pending message to be sent
      setPendingEditMessage(`editar evento id:${eventId} ${message}`);
      // Clear the initial message from parent
      onClearInitialEditMessage?.();
    }
  }, [initialEditMessage, activeView, isLoadingHistory, onClearInitialEditMessage]);

  // Parse message from database format to Message type
  const parseDbMessage = (m: any): Message => {
    let eventData = m.metadata?.eventData;
    
    // FALLBACK: Convert old format (resumo_evento) to new format
    if (eventData && !eventData.title && eventData.resumo_evento) {
      eventData = {
        id: eventData.id || eventData.evento_id,
        title: eventData.resumo_evento.titulo,
        event_date: eventData.resumo_evento.data,
        event_time: eventData.resumo_evento.hora === 'Dia inteiro' ? undefined : eventData.resumo_evento.hora,
        location: eventData.resumo_evento.local,
        description: eventData.description,
        category: eventData.category || 'geral',
        notification_enabled: eventData.notification_enabled ?? true,
        call_alert_enabled: eventData.call_alert_enabled ?? false,
      };
    }
    
    return {
      id: m.id,
      type: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: new Date(m.created_at),
      eventData,
      deletedEventData: m.metadata?.deletedEventData,
      eventsListData: m.metadata?.eventsListData,
      pastDateData: m.metadata?.pastDateData,
      weeklyReportData: m.metadata?.weeklyReportData,
      weeklyReportNotReady: m.metadata?.weeklyReportNotReady,
      weatherData: m.metadata?.weatherData,
      callNotificationData: m.metadata?.callNotificationData,
      pushNotificationData: m.metadata?.pushNotificationData,
      limitReachedData: m.metadata?.limitReachedData,
    };
  };

  // Load initial chat history on mount - only today's messages by default
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        // Calculate start of today (midnight in local timezone)
        const todayStart = startOfDay(new Date());
        
        // Fetch only today's messages (for cleaner, faster chat)
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', todayStart.toISOString())
          .order('created_at', { ascending: true }); // Already chronological
        
        if (error) throw error;

        if (data && data.length > 0) {
          const loadedMessages: Message[] = data.map(parseDbMessage);
          // Deduplicate by id (safety check for duplicate key errors)
          const uniqueMessages = loadedMessages.filter((msg, index, self) => 
            index === self.findIndex(m => m.id === msg.id)
          );
          setMessages(uniqueMessages);
        }
        
        // Check if there are older messages (before today)
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lt('created_at', todayStart.toISOString());
        
        setHasOlderMessages((count ?? 0) > 0);
        setHasMoreMessages(false); // No infinite scroll until history is loaded
        
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [user]);

  // Check and update old "weeklyReportNotReady" messages if report is now available
  useEffect(() => {
    const updateStaleReportCards = async () => {
      if (!user || isLoadingHistory || messages.length === 0) return;

      // Find messages with weeklyReportNotReady that might be stale
      const staleReportMessages = messages.filter(m => 
        m.weeklyReportNotReady && m.type === 'assistant'
      );

      if (staleReportMessages.length === 0) return;

      try {
        // Check if user now has a weekly report
        const { data: reports } = await supabase
          .from('weekly_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (reports && reports.length > 0) {
          // Report is now available! Update the stale messages
          console.log('[ChatPage] Found stale weeklyReportNotReady messages, updating with available report');
          
          const latestReport = reports[0];
          const weeklyReportData = {
            report: latestReport,
            isPreviousWeek: true
          };

          // Update local state
          setMessages(prev => prev.map(m => {
            if (m.weeklyReportNotReady) {
              return {
                ...m,
                weeklyReportNotReady: undefined,
                weeklyReportData,
                content: '📊 Seu resumo semanal chegou!'
              };
            }
            return m;
          }));

          // Update database records
          for (const staleMsg of staleReportMessages) {
            await supabase
              .from('chat_messages')
              .update({
                content: '📊 Seu resumo semanal chegou!',
                metadata: {
                  weeklyReportData,
                  weeklyReportNotReady: undefined
                }
              })
              .eq('id', staleMsg.id);
          }
        }
      } catch (error) {
        console.error('[ChatPage] Error updating stale report cards:', error);
      }
    };

    updateStaleReportCards();
  }, [user, isLoadingHistory, messages.length]);

  // Load full history when user clicks "View full history"
  const handleLoadFullHistory = async () => {
    if (!user || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const todayStart = startOfDay(new Date());
      
      // Load all messages before today (up to 200 for safety)
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .lt('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Reverse to get chronological order
        const olderMessages = [...data].reverse().map(parseDbMessage);
        
        // Prepend older messages to current today's messages
        setMessages(prev => [...olderMessages, ...prev]);
        
        // Check if there are even more messages
        setHasMoreMessages(data.length === 200);
      } else {
        setHasMoreMessages(false);
      }
      
      setShowFullHistory(true);
      setHasOlderMessages(false);
      
      // Scroll to top to show loaded history
      requestAnimationFrame(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
      
    } catch (error) {
      console.error('Error loading full history:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Load more older messages (pagination) - only works after full history is loaded
  const loadMoreMessages = async () => {
    if (!user || isLoadingMore || !hasMoreMessages || messages.length === 0 || !showFullHistory) return;
    
    const oldestMessage = messages[0];
    if (!oldestMessage) return;
    
    setIsLoadingMore(true);
    
    try {
      // Fetch 50 messages older than the current oldest
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .lt('created_at', oldestMessage.createdAt.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Reverse to get chronological order
        const olderMessages = [...data].reverse().map(parseDbMessage);
        
        // Store current scroll height to preserve position
        const container = scrollContainerRef.current;
        const prevScrollHeight = container?.scrollHeight || 0;
        
        // Prepend older messages
        setMessages(prev => [...olderMessages, ...prev]);
        setHasMoreMessages(data.length === 50);
        
        // Restore scroll position after DOM updates
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Scroll listener for infinite pagination (only when full history is loaded)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // When within 100px of the top, load more messages (only if full history mode)
      if (container.scrollTop < 100 && hasMoreMessages && !isLoadingMore && !isLoadingHistory && showFullHistory) {
        loadMoreMessages();
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isLoadingMore, isLoadingHistory, messages, showFullHistory]);

  // Scroll button visibility - re-check when messages change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScrollButton = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      console.log('Distance from bottom:', distanceFromBottom);
      setShowScrollButton(distanceFromBottom > 200);
    };
    
    // Check initial state
    handleScrollButton();
    
    container.addEventListener('scroll', handleScrollButton);
    return () => container.removeEventListener('scroll', handleScrollButton);
  }, [messages.length]);

  const saveMessage = async (role: 'user' | 'assistant', content: string, metadata?: any) => {
    if (!user) return;

    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role,
        content,
        metadata,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const streamChat = async (userMessage: string, allMessages: Message[], imageAnalysis?: any) => {
    setIsLoading(true);
    
    // Safety timeout - force loading off after 30 seconds to prevent UI getting stuck
    const safetyTimeout = setTimeout(() => {
      console.error('[ChatPage] Chat timeout after 30s - forcing loading off');
      setIsLoading(false);
    }, 30000);

    // CRITICAL: Verify session before sending - handle expired JWT
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        console.error('[ChatPage] Session invalid or expired:', sessionError);
        clearTimeout(safetyTimeout);
        setIsLoading(false);
        
        // Try to refresh the token
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('[ChatPage] Failed to refresh session:', refreshError);
          // Force logout and show error
          await supabase.auth.signOut();
          
          // Show error message to user
          setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            type: 'assistant',
            content: '⚠️ Sua sessão expirou. Por favor, faça login novamente para continuar.',
            createdAt: new Date()
          }]);
          return;
        }
        
        console.log('[ChatPage] Session refreshed successfully');
      }
    } catch (sessionCheckError) {
      console.error('[ChatPage] Error checking session:', sessionCheckError);
      clearTimeout(safetyTimeout);
      setIsLoading(false);
      
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: '⚠️ Erro ao verificar sua sessão. Por favor, tente novamente.',
        createdAt: new Date()
      }]);
      return;
    }

    // Get fresh session after potential refresh
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    
    const apiMessages = allMessages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
      created_at: m.createdAt?.toISOString() || new Date().toISOString()
    }));

    let executedActions: ExecutedAction[] = [];

    try {
      console.log('[ChatPage] Starting chat request to:', CHAT_URL);
      console.log('[ChatPage] Messages being sent:', apiMessages.length);
      console.log('[ChatPage] Onboarding step:', onboardingStep);
      
      // Get user's timezone from the device
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[ChatPage] User timezone:', userTimezone);
      
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshSession?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          imageAnalysis,
          isOnboarding: isInOnboarding,
          onboardingStep,
          timezone: userTimezone,
          language: language,
          device_id: deviceId, // For VoIP push (device-centric architecture)
        }),
      });

      console.log('[ChatPage] Response status:', response.status);
      console.log('[ChatPage] Response ok:', response.ok);
      
      // Check for JWT expired error in response
      if (response.status === 401) {
        const errorText = await response.text();
        console.error('[ChatPage] 401 Unauthorized:', errorText);
        
        // Check if it's a JWT expired error
        if (errorText.includes('JWT') || errorText.includes('expired') || errorText.includes('PGRST303')) {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
          
          // Force logout
          await supabase.auth.signOut();
          
          setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            type: 'assistant',
            content: '⚠️ Sua sessão expirou. Por favor, faça login novamente.',
            createdAt: new Date()
          }]);
          return;
        }
      }

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        console.error('[ChatPage] Error response:', errorText);
        throw new Error(errorText || t('chat.errorConnect'));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      const assistantId = Date.now().toString();
      let hasConfirmationCard = false; // Track if we have a confirmation card
      let finalEventData: any = undefined; // Track event data for persistence
      let finalDeletedEventData: any = undefined; // Track deleted event data for persistence
      let finalEventsListData: any[] | undefined = undefined; // Track events list for persistence
      let finalPastDateData: any = undefined; // Track past date warning for persistence
      let finalWeeklyReportData: any = undefined; // Track weekly report data for persistence
      let finalWeeklyReportNotReady: any = undefined; // Track weekly report not ready data
      let finalWeatherData: any = undefined; // Track weather forecast data for persistence
      let finalLimitReachedData: any = undefined; // Track limit reached data for UpgradePlanCard

      setMessages(prev => [...prev, {
        id: assistantId,
        type: 'assistant',
        content: '',
        createdAt: new Date()
      }]);

      console.log('[ChatPage] Starting SSE stream processing');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[ChatPage] Stream ended');
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        textBuffer += chunk;

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          
          if (jsonStr === "[DONE]") {
            console.log('[ChatPage] Received [DONE] marker');
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Handle custom SSE format from image analysis ({"text": ...}, {"action": ...})
            if (parsed.text && !parsed.choices) {
              console.log('[ChatPage] Image analysis text:', parsed.text);
              assistantContent += parsed.text;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
              continue;
            }
            
            if (parsed.action && !parsed.choices) {
              console.log('[ChatPage] Image analysis action:', parsed.action);
              // Convert to executedAction format
              const action = parsed.action;
              executedActions = [{
                action: action.acao,
                success: action.success ?? true,
                resumo_evento: action.resumo_evento,
                data: action.eventData || action,
                eventData: action.eventData
              }];
              
              // Handle criar_evento action from image analysis (optimistic flow)
              if (action.acao === 'criar_evento' && action.eventData) {
                console.log('[ChatPage] Event created from image, showing card');
                const eventData = action.eventData;
                finalEventData = {
                  id: eventData.id,
                  title: eventData.title,
                  event_date: eventData.event_date,
                  event_time: eventData.event_time,
                  location: eventData.location,
                  category: eventData.category || 'evento',
                  notification_enabled: eventData.notification_enabled ?? true,
                  call_alert_enabled: eventData.call_alert_enabled ?? false,
                };
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { 
                    ...m, 
                    content: assistantContent,
                    eventData: finalEventData
                  } : m
                ));
                // Trigger event refresh
                onEventCreated?.();
              }
              // Handle past date warning from image analysis
              else if (action.acao === 'data_passada') {
                console.log('[ChatPage] Past date detected from image, showing warning card');
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { 
                    ...m, 
                    content: assistantContent,
                    pastDateData: {
                      titulo: action.titulo,
                      data: action.data,
                      hora: action.hora,
                      local: action.local
                    }
                  } : m
                ));
              }
              // Legacy: Handle confirmation action (kept for compatibility)
              else if (action.acao === 'solicitar_confirmacao' && action.resumo_evento) {
                console.log('[ChatPage] Showing inline confirmation for image analysis');
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { 
                    ...m, 
                    content: assistantContent,
                    confirmationData: action.resumo_evento,
                    pendingImageEvent: action
                  } : m
                ));
              }
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              // Check for action metadata
              const actionMatch = content.match(/<!--KAIRO_ACTIONS:(.+?)-->/);
              if (actionMatch) {
                try {
                  executedActions = JSON.parse(actionMatch[1]);
                  console.log('[ChatPage] Actions parsed:', executedActions);
                  const cleanContent = content.replace(/<!--KAIRO_ACTIONS:.+?-->\n?/, '');
                  
                  // Add clean content if present
                  if (cleanContent) {
                    assistantContent += cleanContent;
                  }
                  
                  // ALWAYS process actions - moved OUTSIDE of cleanContent check!
                  // Check if event was created - MUST have success:true AND an ID
                  const eventAction = executedActions.find(a => a.action === 'criar_evento' && a.success);
                  const failedEventAction = executedActions.find(a => 
                    a.action === 'criar_evento' && (!a.success || (!a.data?.id && !a.eventId))
                  );
                  
                  // CRITICAL: Check for failed event creation immediately
                  if (failedEventAction) {
                    console.error('[ChatPage] EVENT CREATION FAILED:', {
                      error: failedEventAction.error,
                      hasId: !!(failedEventAction.data?.id || failedEventAction.eventId),
                      success: failedEventAction.success
                    });
                    toast.error(failedEventAction.error || 'Não foi possível criar o evento. Tente novamente.');
                  }
                  
                  const eventResumo = eventAction 
                    ? (eventAction.resumo_evento || eventAction.data?.resumo_evento)
                    : undefined;
                  
                  // CRITICAL: Verify event has an ID before showing card
                  const eventHasValidId = eventAction && (eventAction.data?.id || eventAction.eventId);
                  
                  // Check if confirmation is being requested (legacy flow, kept for compatibility)
                  const confirmationAction = executedActions.find(a => a.action === 'solicitar_confirmacao');
                  const confirmationResumo = confirmationAction 
                    ? (confirmationAction.resumo_evento || confirmationAction.data?.resumo_evento)
                    : undefined;
                  
                  // For optimistic creation, we show the card directly after creation
                  // MUST have both resumo AND valid ID
                  const showCreatedCard = !!eventAction && !!eventResumo && !!eventHasValidId;
                  
                  // Check if event was UPDATED
                  const updateAction = executedActions.find(a => a.action === 'editar_evento' && a.success);
                  const updateResumo = updateAction 
                    ? (updateAction.resumo_evento || updateAction.data?.resumo_evento)
                    : undefined;
                  const showUpdatedCard = !!updateAction && !!updateResumo;
                  
                  console.log('[ChatPage] Event processing:', { 
                    eventAction: !!eventAction, 
                    eventResumo: !!eventResumo, 
                    showCreatedCard,
                    updateAction: !!updateAction,
                    updateResumo: !!updateResumo,
                    showUpdatedCard
                  });
                  
                  // Determine eventData - prioritize update over create
                  let eventData = undefined;
                  if (showUpdatedCard) {
                    // For UPDATE: use evento_atualizado (Supabase format) if available
                    const updatedEvent = updateAction.evento_atualizado || updateAction.data?.evento_atualizado;
                    if (updatedEvent) {
                      // Already in correct Supabase format for EventCreatedCard
                      eventData = {
                        id: updatedEvent.id, // CRITICAL: Include id for toggle to work
                        title: updatedEvent.title,
                        event_date: updatedEvent.event_date,
                        event_time: updatedEvent.event_time,
                        duration_minutes: updatedEvent.duration_minutes,
                        location: updatedEvent.location,
                        description: updatedEvent.description,
                        category: updatedEvent.category || 'geral',
                        notification_enabled: updatedEvent.notification_enabled ?? true,
                        call_alert_enabled: updatedEvent.call_alert_enabled ?? false,
                        emoji: updatedEvent.emoji || '📅',
                        color: updatedEvent.color || 'primary',
                        is_all_day: updatedEvent.is_all_day ?? !updatedEvent.event_time,
                        isUpdate: true,
                        _createdAt: Date.now() // Para calcular se deve mostrar botão editar
                      };
                    } else if (updateResumo) {
                      // Fallback: convert from Portuguese format (no id available)
                      eventData = {
                        title: updateResumo.titulo,
                        event_date: updateResumo.data,
                        event_time: updateResumo.hora === 'Dia inteiro' ? undefined : updateResumo.hora,
                        location: updateResumo.local || undefined,
                        category: 'geral',
                        notification_enabled: true,
                        call_alert_enabled: false,
                        emoji: '📅',
                        color: 'primary',
                        is_all_day: updateResumo.hora === 'Dia inteiro',
                        isUpdate: true,
                        _createdAt: Date.now()
                      };
                    }
                  } else if (showCreatedCard) {
                    // For CREATE: explicitly extract all fields including id
                    const eventFromDb = eventAction.data;
                    const verifiedEventId = eventFromDb?.id || eventAction.eventId;
                    console.log('[ChatPage] eventFromDb for create:', { eventFromDb, verifiedEventId });
                    
                    // CRITICAL: Only create eventData if we have a valid ID
                    if (verifiedEventId) {
                      eventData = {
                        id: verifiedEventId, // CRITICAL: Include id for toggle to work
                        title: eventFromDb?.title || eventResumo?.titulo,
                        event_date: eventFromDb?.event_date || eventResumo?.data,
                        event_time: eventFromDb?.event_time || (eventResumo?.hora === 'Dia inteiro' ? undefined : eventResumo?.hora),
                        duration_minutes: eventFromDb?.duration_minutes,
                        location: eventFromDb?.location || eventResumo?.local,
                        description: eventFromDb?.description,
                        category: eventFromDb?.category || 'geral',
                        notification_enabled: eventFromDb?.notification_enabled ?? true,
                        call_alert_enabled: eventFromDb?.call_alert_enabled ?? false,
                        emoji: eventFromDb?.emoji || '📅',
                        color: eventFromDb?.color || 'primary',
                        is_all_day: eventFromDb?.is_all_day ?? !eventFromDb?.event_time,
                        resumo_evento: eventResumo,
                        _createdAt: Date.now() // Para calcular se deve mostrar botão editar
                      };
                    } else {
                      // No valid ID - mark as failed immediately
                      console.error('[ChatPage] CRITICAL: Event created but no ID returned!');
                      eventData = {
                        title: eventResumo?.titulo || 'Evento',
                        event_date: eventResumo?.data,
                        event_time: eventResumo?.hora === 'Dia inteiro' ? undefined : eventResumo?.hora,
                        location: eventResumo?.local,
                        category: 'geral',
                        notification_enabled: false,
                        call_alert_enabled: false,
                        emoji: '📅',
                        color: 'primary',
                        is_all_day: eventResumo?.hora === 'Dia inteiro',
                        saveFailed: true,
                        saveFailedReason: 'ID não retornado pelo servidor - evento não foi salvo',
                        resumo_evento: eventResumo,
                        _createdAt: Date.now()
                      };
                      toast.error('Erro ao salvar evento. Tente novamente.');
                    }
                  } else if (failedEventAction) {
                    // Explicitly failed event - show error card
                    const failedResumo = failedEventAction.resumo_evento || failedEventAction.data?.resumo_evento;
                    eventData = {
                      title: failedResumo?.titulo || 'Evento',
                      event_date: failedResumo?.data,
                      event_time: failedResumo?.hora === 'Dia inteiro' ? undefined : failedResumo?.hora,
                      location: failedResumo?.local,
                      category: 'geral',
                      notification_enabled: false,
                      call_alert_enabled: false,
                      emoji: '📅',
                      color: 'primary',
                      is_all_day: failedResumo?.hora === 'Dia inteiro',
                      saveFailed: true,
                      saveFailedReason: failedEventAction.error || 'Falha ao salvar evento',
                      resumo_evento: failedResumo,
                      _createdAt: Date.now()
                    };
                  }
                  
                  // Store for persistence - MUST include id for toggle to work
                  if (eventData) {
                    finalEventData = eventData;
                    console.log('[ChatPage] Storing finalEventData for persistence:', {
                      id: finalEventData?.id,
                      title: finalEventData?.title,
                      hasId: !!finalEventData?.id
                    });
                  }
                  
                  // Check if events were LISTED
                  const listAction = executedActions.find(a => a.action === 'listar_eventos' && a.success);
                  const listedEvents = listAction?.eventos || listAction?.data?.eventos;
                  
                  // Store for persistence
                  if (listedEvents) {
                    finalEventsListData = listedEvents;
                  }
                  
                  // Check if event was DELETED
                  const deleteAction = executedActions.find(a => a.action === 'deletar_evento' && a.success);
                  const deletedEvent = deleteAction?.evento_deletado || deleteAction?.data?.evento_deletado;
                  let deletedEventData = undefined;
                  
                  if (deleteAction && deletedEvent) {
                    deletedEventData = {
                      id: deletedEvent.id,
                      title: deletedEvent.title,
                      event_date: deletedEvent.event_date,
                      event_time: deletedEvent.event_time,
                      location: deletedEvent.location,
                      category: deletedEvent.category,
                    };
                    console.log('[ChatPage] Delete action detected:', deletedEventData);
                    finalDeletedEventData = deletedEventData; // Store for persistence
                  }
                  
                  // Check if PAST DATE warning
                  const pastDateAction = executedActions.find(a => a.action === 'data_passada');
                  let pastDateData = undefined;
                  
                  if (pastDateAction) {
                    pastDateData = {
                      titulo: pastDateAction.data?.titulo,
                      data: pastDateAction.data?.data,
                      hora: pastDateAction.data?.hora,
                      local: pastDateAction.data?.local
                    };
                    console.log('[ChatPage] Past date warning detected:', pastDateData);
                    finalPastDateData = pastDateData; // Store for persistence
                  }
                  
                  // Check if WEEKLY REPORT requested
                  const weeklyReportAction = executedActions.find(a => a.action === 'relatorio_semanal');
                  let weeklyReportData = undefined;
                  
                  if (weeklyReportAction?.weeklyReportData) {
                    weeklyReportData = weeklyReportAction.weeklyReportData;
                    console.log('[ChatPage] Weekly report found:', weeklyReportData);
                    finalWeeklyReportData = weeklyReportData;
                  }
                  
                  // Check if WEEKLY REPORT NOT READY
                  const weeklyReportNotReadyAction = executedActions.find(a => a.action === 'relatorio_nao_pronto');
                  let weeklyReportNotReady = undefined;
                  
                  if (weeklyReportNotReadyAction?.weeklyReportNotReady) {
                    weeklyReportNotReady = weeklyReportNotReadyAction.weeklyReportNotReady;
                    console.log('[ChatPage] Weekly report not ready:', weeklyReportNotReady);
                    finalWeeklyReportNotReady = weeklyReportNotReady;
                  }
                  
                  // Check if WEATHER FORECAST requested
                  const weatherAction = executedActions.find(a => a.action === 'previsao_tempo');
                  let weatherData = undefined;
                  
                  if (weatherAction?.weatherData) {
                    weatherData = weatherAction.weatherData;
                    console.log('[ChatPage] Weather forecast found:', weatherData);
                    finalWeatherData = weatherData;
                  }
                  
                  // Check if LIMIT REACHED
                  const limitReachedAction = executedActions.find(a => a.limitReached && a.limitData);
                  let limitReachedData = undefined;
                  
                  if (limitReachedAction?.limitData) {
                    limitReachedData = limitReachedAction.limitData;
                    console.log('[ChatPage] Limit reached:', limitReachedData);
                    finalLimitReachedData = limitReachedData;
                  }
                  
                  console.log('[ChatPage] List events processing:', { 
                    listAction: !!listAction, 
                    listedEvents: listedEvents?.length || 0 
                  });
                  
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId ? { 
                      ...m, 
                      content: confirmationResumo ? '' : assistantContent,
                      actions: executedActions,
                      isCreatingEvent: !!eventAction && !showCreatedCard,
                      eventData,
                      deletedEventData,
                      eventsListData: listedEvents,
                      confirmationData: confirmationResumo,
                      pastDateData,
                      weeklyReportData,
                      weeklyReportNotReady,
                      weatherData,
                      limitReachedData,
                    } : m
                  ));

                  // If confirmation is requested (legacy), open modal
                  if (confirmationResumo) {
                    hasConfirmationCard = true;
                    setConfirmationModal({
                      isOpen: true,
                      resumo: confirmationResumo,
                      messageId: assistantId
                    });
                  }

                  // If event was created WITHOUT resumo (legacy), show animation then reveal card
                  if (eventAction && !eventResumo) {
                    setTimeout(() => {
                      setMessages(prev => prev.map(m => 
                        m.id === assistantId ? { 
                          ...m, 
                          isCreatingEvent: false,
                          eventData: eventAction.data 
                        } : m
                      ));
                    }, 2000);
                  }
                } catch (e) {
                  console.error('[ChatPage] Error parsing actions:', e);
                }
              } else {
                // Skip text content if we already have a confirmation card
                if (!hasConfirmationCard) {
                  assistantContent += content;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId ? { ...m, content: assistantContent, actions: executedActions.length > 0 ? executedActions : undefined } : m
                  ));
                }
              }
            }
          } catch (parseError) {
            console.error('[ChatPage] JSON parse error:', parseError);
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message after streaming completes with metadata for cards
      // DEBUG: Log what we have before saving
      console.log('[ChatPage] BEFORE saveMessage - checking finalEventData:', {
        hasAssistantContent: !!assistantContent,
        assistantContentLength: assistantContent?.length,
        hasFinalEventData: !!finalEventData,
        finalEventData: finalEventData,
        hasFinalEventsListData: !!finalEventsListData,
        finalEventsListCount: finalEventsListData?.length,
        executedActionsCount: executedActions.length,
        executedActions: executedActions.map(a => ({ action: a.action, success: a.success })),
      });
      
      if (assistantContent || finalEventData || finalDeletedEventData || finalEventsListData || finalPastDateData || finalWeeklyReportData || finalWeeklyReportNotReady || finalWeatherData || finalLimitReachedData) {
        const metadata = (finalEventData || finalDeletedEventData || finalEventsListData || finalPastDateData || finalWeeklyReportData || finalWeeklyReportNotReady || finalWeatherData || finalLimitReachedData) 
          ? { 
              eventData: finalEventData, 
              deletedEventData: finalDeletedEventData, 
              eventsListData: finalEventsListData, 
              pastDateData: finalPastDateData,
              weeklyReportData: finalWeeklyReportData,
              weeklyReportNotReady: finalWeeklyReportNotReady,
              weatherData: finalWeatherData,
              limitReachedData: finalLimitReachedData,
            }
          : undefined;
        
        console.log('[ChatPage] Constructed metadata for save:', metadata);
        await saveMessage('assistant', assistantContent || '', metadata);
      } else {
        console.warn('[ChatPage] NOT saving - no content or event data!');
      }

      // Handle executed actions
      for (const action of executedActions) {
        if (action.success) {
          if (action.action === 'criar_evento') {
            onEventCreated?.();
            
            // VALIDATION: Verify event was actually saved to database
            if (finalEventData?.id) {
              console.log('[ChatPage] Verifying event was saved:', finalEventData.id);
              // Wait a moment for DB propagation
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              const { data: savedEvent, error: verifyError } = await supabase
                .from('events')
                .select('id')
                .eq('id', finalEventData.id)
                .maybeSingle();
              
              if (verifyError || !savedEvent) {
                console.error('[ChatPage] EVENT VERIFICATION FAILED! Event not found in DB:', {
                  eventId: finalEventData.id,
                  error: verifyError
                });
                
                // Update the message to show save failed state
                setMessages(prev => prev.map(m => {
                  if (m.eventData?.id === finalEventData.id) {
                    return {
                      ...m,
                      eventData: {
                        ...m.eventData,
                        saveFailed: true,
                        saveFailedReason: verifyError?.message || 'Evento não encontrado no banco'
                      }
                    };
                  }
                  return m;
                }));
              } else {
                console.log('[ChatPage] Event verification SUCCESS:', savedEvent.id);
              }
            }
            
            // Check if this is first event during onboarding
            if (isInOnboarding && (onboardingStep === 'welcome' || onboardingStep === 'guiding')) {
              await markFirstEventCreated();
              
              // Add success message after a delay (card already shown in the animation message)
              setTimeout(async () => {
                const successMessage: Message = {
                  id: `success-${Date.now()}`,
                  type: 'assistant',
                  content: ONBOARDING_FIRST_EVENT_SUCCESS,
                  createdAt: new Date(),
                };
                setMessages(prev => [...prev, successMessage]);
                await saveMessage('assistant', ONBOARDING_FIRST_EVENT_SUCCESS);
                
                // After a short delay, show weekly planning suggestion
                setTimeout(() => {
                  setShowWeeklySuggestion(true);
                  setOnboardingStep('suggest_weekly');
                }, 2000);
              }, 2500); // After animation completes
            }
          } else if (action.action === 'deletar_evento') {
            onEventCreated?.();
          } else if (action.action === 'editar_evento') {
            onEventCreated?.();
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      clearTimeout(safetyTimeout);
      setIsLoading(false);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;
    
    // If in welcome step, move to guiding
    if (onboardingStep === 'welcome') {
      setOnboardingStep('guiding');
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      createdAt: new Date()
    };
    
    // Deduplicate to prevent duplicate key errors
    const newMessages = [...messages.filter(m => m.id !== userMessage.id), userMessage];
    setMessages(newMessages);
    setInputValue('');
    
    await saveMessage('user', messageText);
    await streamChat(messageText, newMessages);
  };

  // Process pending edit message from EventDetailPage
  useEffect(() => {
    if (pendingEditMessage && !isLoading && !isLoadingHistory) {
      handleSend(pendingEditMessage);
      setPendingEditMessage(null);
    }
  }, [pendingEditMessage, isLoading, isLoadingHistory]);

  const handleSuggestionClick = (text: string) => {
    handleSend(text);
  };

  // Handle retry saving event - recreates the event via chat
  const handleRetryEvent = async (failedEvent: any) => {
    console.log('[ChatPage] Retrying failed event:', failedEvent);
    
    // Build a command to recreate the event
    let command = `Criar evento: ${failedEvent.title}`;
    
    if (failedEvent.event_date) {
      command += ` no dia ${failedEvent.event_date}`;
    }
    if (failedEvent.event_time) {
      command += ` às ${failedEvent.event_time}`;
    }
    if (failedEvent.location) {
      command += ` em ${failedEvent.location}`;
    }
    if (failedEvent.description) {
      command += ` - ${failedEvent.description}`;
    }
    
    // Remove the failed message
    setMessages(prev => prev.filter(m => !m.eventData?.saveFailed || m.eventData?.title !== failedEvent.title));
    
    // Resend the event creation command
    await handleSend(command);
  };

  // Handle event confirmation - for image analysis, create event directly
  const handleConfirmEvent = async (pendingEvent?: any) => {
    setConfirmationModal({ isOpen: false, resumo: null, messageId: null });
    
    if (pendingEvent) {
      // Create event directly from image analysis data
      console.log('[ChatPage] Creating event from image analysis:', pendingEvent);
      
      // Clear the confirmation card and show creating animation
      const msgId = Date.now().toString();
      setMessages(prev => prev.map(m => 
        m.confirmationData ? { ...m, confirmationData: undefined, pendingImageEvent: undefined } : m
      ));
      
      // Send confirmation to create the event
      await handleSend(`Criar evento: ${pendingEvent.titulo} no dia ${pendingEvent.data} às ${pendingEvent.hora}${pendingEvent.local ? ` em ${pendingEvent.local}` : ''}`);
    } else {
      handleSend("confirmar");
    }
  };

  // Handle edit request from confirmation card
  const handleEditEvent = () => {
    setConfirmationModal({ isOpen: false, resumo: null, messageId: null });
    // Clear confirmation data to allow editing
    setMessages(prev => prev.map(m => 
      m.confirmationData ? { ...m, confirmationData: undefined, pendingImageEvent: undefined } : m
    ));
    handleSend("editar");
  };

  // Handle edit request for a specific event by ID - opens modal instead of sending chat message
  const handleEditEventById = async (eventId: string) => {
    console.log('[ChatPage] Opening edit modal for event:', eventId);
    
    try {
      // Fetch the event data from Supabase
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error) {
        console.error('[ChatPage] Error fetching event:', error);
        return;
      }
      
      if (!eventData) {
        console.error('[ChatPage] Event not found');
        return;
      }
      
      // Open the edit modal with the event data
      setEditingEvent(eventData);
    } catch (err) {
      console.error('[ChatPage] Error in handleEditEventById:', err);
    }
  };

  // Close confirmation modal
  const handleCloseConfirmationModal = () => {
    setConfirmationModal({ isOpen: false, resumo: null, messageId: null });
  };

  // Handle weekly planning suggestion
  const handleAcceptWeeklyPlanning = async () => {
    setShowWeeklySuggestion(false);
    await handleSend("Criar lembrete: Planejamento semanal toda segunda-feira às 9h");
    
    // After weekly planning, show calendar suggestion
    setTimeout(() => {
      setShowCalendarSuggestion(true);
      setOnboardingStep('suggest_calendar');
    }, 2000);
  };

  const handleSkipWeeklyPlanning = () => {
    setShowWeeklySuggestion(false);
    setShowCalendarSuggestion(true);
    setOnboardingStep('suggest_calendar');
  };

  // Handle calendar connection suggestion
  const handleAcceptCalendarConnection = () => {
    setShowCalendarSuggestion(false);
    // TODO: Implement calendar connection flow
    completeOnboarding();
  };

  const handleSkipCalendarConnection = () => {
    setShowCalendarSuggestion(false);
    completeOnboarding();
  };

  // AUDIO RECORDING - with preview before sending
  const handleMicPress = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      setIsTranscribing(true);
      try {
        const audioBase64 = await stopRecording();
        if (!audioBase64) {
          throw new Error('Nenhum áudio gravado');
        }

        console.log('Sending audio for transcription...');

        // Send to Whisper for transcription
        const response = await fetch(TRANSCRIBE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ audio: audioBase64 }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro na transcrição');
        }

        const result = await response.json();
        console.log('Transcription result:', result);

        if (result.text) {
          // Show preview instead of sending immediately
          setTranscribedText(result.text);
        }
      } catch (error) {
        console.error('Transcription error:', error);
        setTranscribedText(null);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      setTranscribedText(null);
      try {
        await startRecording();
      } catch (error) {
        console.error('Recording error:', error);
      }
    }
  };

  // Audio overlay handlers
  const handleCancelAudio = () => {
    setTranscribedText(null);
    setIsTranscribing(false);
  };

  const handleConfirmAudioSend = async () => {
    if (transcribedText) {
      await handleSend(transcribedText);
      setTranscribedText(null);
    }
  };

  const handleRetryAudio = async () => {
    setTranscribedText(null);
    try {
      await startRecording();
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  // IMAGE CAPTURE
  const handleImageCapture = async (fromCamera: boolean) => {
    setIsAnalyzingImage(true);
    try {
      const imageData = fromCamera 
        ? await captureFromCamera() 
        : await selectFromGallery();

      if (!imageData) {
        setIsAnalyzingImage(false);
        return;
      }

      console.log('Analyzing image...');

      // Add user message with image preview (no text, just the image)
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: '', // No text - just the image
        createdAt: new Date(),
        imagePreview: `data:${imageData.mimeType};base64,${imageData.base64}`,
      };
      
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      await saveMessage('user', '[Imagem enviada]');
      
      // Add loading indicator message while analyzing
      const loadingMessage: Message = {
        id: `loading-${Date.now()}`,
        type: 'assistant',
        content: '...',
        createdAt: new Date(),
      };
      setMessages([...newMessages, loadingMessage]);

      // Send to vision API for analysis
      const response = await fetch(ANALYZE_IMAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          image: imageData.base64,
          mimeType: imageData.mimeType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro na análise');
      }

      const analysisResult = await response.json();
      console.log('Image analysis result:', analysisResult);

      // Remove loading message before streaming response
      setMessages(newMessages);
      
      // Send to chat - the edge function will use imageAnalysis to create event
      await streamChat('', newMessages, analysisResult);

    } catch (error) {
      console.error('Image analysis error:', error);
      // Remove loading message on error
      setMessages(messages);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const isProcessing = isLoading || isTranscribing || isAnalyzingImage;

  // Get welcome message based on onboarding state
  const getWelcomeMessage = () => {
    if (isInOnboarding && messages.length === 0) {
      return ONBOARDING_WELCOME;
    }
    // Regular greeting with name
    const name = displayName ? `${displayName}! ` : '';
    return `E aí ${name}O que vamos agendar hoje?`;
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Fixed Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 safe-area-top">
        {/* Single gradient: opaque at top (status bar) -> transparent at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-transparent pointer-events-none" />
        
        <div className="relative flex items-center justify-center gap-2 px-4 py-3">
          {/* Calendar View - Left */}
          <button
            onClick={() => onViewChange('calendar')}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 bg-muted/50 text-foreground hover:bg-muted"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          
          {/* Center - Kairo Logo */}
          <button
            onClick={() => onViewChange('chat')}
            className="w-14 h-14 rounded-full overflow-hidden mx-2 shadow-lg shadow-primary/30 border-2 border-primary/30"
          >
            <img src={resolvedTheme === 'dark' ? horahHeaderDark : horahHeader} alt="Horah" className="w-full h-full object-cover" />
          </button>
          
          {/* Settings - Right */}
          <button
            onClick={onOpenSettings}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 bg-muted/50 text-foreground hover:bg-muted"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages - Timeline style */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 pb-44 pt-24 hide-scrollbar"
      >
        {/* Loading more indicator (top) */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        
        {/* View Full History Button - shown when there are older messages */}
        {!showFullHistory && hasOlderMessages && !isLoadingHistory && (
          <button
            onClick={handleLoadFullHistory}
            disabled={isLoadingMore}
            className="flex items-center justify-center gap-2 mx-auto px-4 py-2 mt-16 mb-6 text-xs 
                       bg-primary/10 text-primary/70 hover:text-primary hover:bg-primary/15
                       rounded-full transition-all duration-200 disabled:opacity-50"
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('chat.viewFullHistory')}</span>
          </button>
        )}
        
        {/* End of conversation indicator - only shown when full history is loaded */}
        {showFullHistory && !hasMoreMessages && messages.length > 0 && !isLoadingHistory && (
          <p className="text-center text-[10px] text-muted-foreground py-4">
            {t('chat.startOfConversation')}
          </p>
        )}

        {/* Loading initial history indicator */}
        {(isLoadingHistory || isOnboardingLoading) && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Show suggestions when chat is empty */}
        {!isLoadingHistory && !isOnboardingLoading && messages.length === 0 && (
          <div className="pt-4">
            {/* Timestamp */}
            <p className="text-center text-[10px] text-muted-foreground mb-4">
              {formatMessageTime(new Date())}
            </p>
            
            {/* Welcome message */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-lg shadow-primary/20">
<img src={horahAvatar} alt="Horah" className="w-full h-full object-cover mask-fade-bottom" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {getWelcomeMessage()}
                </p>
              </div>
            </div>
            
            {/* Suggestions - vertical stack, left aligned */}
            <div className="flex flex-col gap-2 pl-11">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-start gap-2.5 bg-kairo-surface-2 hover:bg-kairo-surface-3 border border-border/20 rounded-2xl px-4 py-3 text-left transition-all duration-300 hover:border-primary/20 w-fit max-w-[85%]"
                >
                  <span className="text-lg">{suggestion.emoji}</span>
                  <span className="text-xs text-foreground/90 leading-relaxed">{suggestion.text}</span>
                </button>
              ))}
            </div>

            {/* Onboarding helper text */}
            {isInOnboarding && (
              <div className="mt-6 pl-11">
                <p className="text-xs text-muted-foreground italic">
                  Pode ser algo simples, como escovar os dentes. Ou algo importante, como uma reunião.
                  Escreve do jeito que você falaria.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Messages with timeline */}
        <div className="relative">
          {messages.length > 0 && (
            <div className="timeline-line" />
          )}
          
          {messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showTimestamp = shouldShowTimestamp(message, prevMessage);
            
            return (
              <div key={message.id} className="relative">
                {/* Timestamp */}
                {showTimestamp && (
                  <p className="text-center text-[10px] text-muted-foreground my-4 relative z-10">
                    {formatMessageTime(message.createdAt)}
                  </p>
                )}
                
                {message.type === 'assistant' ? (
                  <div className="flex flex-col gap-3 mb-4">
                    {/* Only show message content if there's text */}
                    {message.content && (
                      <div className="flex items-start gap-3 pl-1">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow-sm z-10">
<img src={resolvedTheme === 'dark' ? horahAvatarDark : horahAvatar} alt="Horah" className="w-full h-full object-cover mask-fade-bottom" />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Event Confirmation Card */}
                    {message.confirmationData && (
                      <div className="flex items-start gap-3 pl-1">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow-sm z-10">
<img src={horahAvatar} alt="Horah" className="w-full h-full object-cover mask-fade-bottom" />
                        </div>
                        <EventConfirmationCard
                          resumo={message.confirmationData}
                          onConfirm={() => handleConfirmEvent(message.pendingImageEvent)}
                          onEdit={handleEditEvent}
                        />
                      </div>
                    )}
                    
                    {/* Event Creation Animation */}
                    {message.isCreatingEvent && (
                      <div className="pl-9">
                        <EventCreatingAnimation />
                      </div>
                    )}
                    
                    {/* Event Card */}
                    {message.eventData && !message.isCreatingEvent && (
                      <div className="pl-9 animate-fade-in">
                        <EventCreatedCard 
                          event={message.eventData} 
                          type={message.eventData.isUpdate ? 'updated' : 'created'}
                          onEdit={handleEditEventById}
                          onRetry={handleRetryEvent}
                        />
                      </div>
                    )}
                    
                    {/* Deleted Event Card */}
                    {message.deletedEventData && (
                      <div className="pl-9 animate-fade-in">
                        <EventDeletedCard event={message.deletedEventData} />
                      </div>
                    )}
                    
                    {/* Past Date Warning Card */}
                    {message.pastDateData && (
                      <div className="pl-9 animate-fade-in">
                        <PastDateCard event={message.pastDateData} />
                      </div>
                    )}
                    
                    {/* Events List Cards */}
                    {message.eventsListData && message.eventsListData.length > 0 && (
                      <div className="pl-9 animate-fade-in">
                        <EventListCard events={message.eventsListData} />
                      </div>
                    )}
                    
                    {/* Weekly Report Card */}
                    {message.weeklyReportData && (
                      <div className="pl-9 animate-fade-in">
                        <WeeklyReportCard 
                          report={message.weeklyReportData.report} 
                          onClick={() => setSelectedWeeklyReport(message.weeklyReportData?.report)}
                        />
                        {message.weeklyReportData.isPreviousWeek && (
                          <div className="mt-2 ml-2 text-xs text-muted-foreground flex items-center gap-1">
                            <span>📋</span>
                            <span>{language === 'en-US' ? 'Previous week report' : language === 'es-ES' ? 'Informe de la semana pasada' : language === 'ja-JP' ? '先週のレポート' : language === 'ko-KR' ? '지난주 리포트' : language === 'zh-CN' ? '上周报告' : 'Relatório da semana passada'}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Weekly Report Not Ready Card */}
                    {message.weeklyReportNotReady && (
                      <div className="pl-9 animate-fade-in">
                        <WeeklyReportNotReadyCard daysRemaining={message.weeklyReportNotReady.daysRemaining} />
                      </div>
                    )}
                    
                    {/* Weather Forecast Card */}
                    {message.weatherData && (
                      <div className="pl-9 animate-fade-in">
                        <WeatherForecastCard 
                          weather={message.weatherData} 
                          onClick={() => setSelectedWeatherForecast(message.weatherData)}
                        />
                      </div>
                    )}
                    
                    {/* Call Notification Card - only for native VoIP calls */}
                    {message.callNotificationData && (
                      <div className="pl-9 animate-fade-in">
                        <CallNotificationCard
                          eventId={message.callNotificationData.eventId}
                          eventTitle={message.callNotificationData.eventTitle}
                          eventTime={message.callNotificationData.eventTime}
                          callSentAt={message.callNotificationData.callSentAt}
                          answered={message.callNotificationData.answered}
                        />
                      </div>
                    )}
                    
                    {/* Push Notification Card - for regular push fallback */}
                    {message.pushNotificationData && (
                      <div className="pl-9 animate-fade-in">
                        <PushNotificationCard
                          eventId={message.pushNotificationData.eventId}
                          eventTitle={message.pushNotificationData.eventTitle}
                          eventTime={message.pushNotificationData.eventTime}
                          notificationSentAt={message.pushNotificationData.notificationSentAt}
                        />
                      </div>
                    )}
                    
                    {/* Upgrade Plan Card - when event limit is reached */}
                    {message.limitReachedData && (
                      <div className="pl-9 animate-fade-in">
                        <UpgradePlanCard limitData={message.limitReachedData} />
                      </div>
                    )}
                    
                  </div>
                ) : (
                  <div className="flex flex-col items-end mb-4 pl-12">
                    {message.imagePreview && (
                      <div className="mb-2 rounded-2xl overflow-hidden max-w-[200px]">
                        <img 
                          src={message.imagePreview} 
                          alt="Imagem enviada" 
                          className="w-full h-auto"
                        />
                      </div>
                    )}
                    {/* Only show text bubble if there's content */}
                    {message.content && message.content.trim() !== '' && (
                      <div className="bg-primary/20 border border-primary/30 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                        <p className="text-sm text-foreground">{message.content}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 mb-4 pl-1">
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow-sm z-10">
                <img src={horahAvatar} alt="Horah" className="w-full h-full object-cover mask-fade-bottom" />
              </div>
              <div className="flex items-center gap-1 pt-2">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {/* Onboarding Suggestion Cards */}
          {showWeeklySuggestion && (
            <div className="pl-9 mb-4">
              <OnboardingSuggestionCard
                type="weekly_planning"
                onAccept={handleAcceptWeeklyPlanning}
                onSkip={handleSkipWeeklyPlanning}
              />
            </div>
          )}

          {showCalendarSuggestion && (
            <div className="pl-9 mb-4">
              <OnboardingSuggestionCard
                type="connect_calendar"
                onAccept={handleAcceptCalendarConnection}
                onSkip={handleSkipCalendarConnection}
              />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-10 h-10 rounded-full bg-background/80 backdrop-blur-lg border border-border/40 shadow-lg flex items-center justify-center transition-all duration-300 animate-fade-in hover:scale-110 hover:bg-background"
        >
          <ChevronDown className="w-5 h-5 text-foreground" />
        </button>
      )}

      {/* Input with safe area - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 safe-area-bottom bg-background/95 backdrop-blur-xl border-t border-border/20">
        <div className="bg-kairo-surface-2 border border-border/30 rounded-2xl px-4 py-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isRecording ? "Gravando..." : (isInOnboarding ? "Digite ou fale seu lembrete..." : t('chat.placeholder'))}
            disabled={isProcessing}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none py-1 mb-2 disabled:opacity-50"
          />
          
          <div className="flex items-center justify-between">
            {/* Mic/Send button on left */}
            {inputValue ? (
              <button 
                onClick={() => handleSend()}
                disabled={isProcessing}
                className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/30 golden-ripple"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            ) : (
              <button 
                onClick={handleMicPress}
                disabled={isTranscribing || isLoading}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 animate-pulse' 
                    : isTranscribing
                    ? 'bg-kairo-surface-3 opacity-50'
                    : 'bg-kairo-surface-3 hover:bg-kairo-surface-2'
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className="w-4 h-4 text-foreground animate-spin" />
                ) : (
                  <Mic className={`w-4 h-4 ${isRecording ? 'text-white' : 'text-foreground'}`} />
                )}
              </button>
            )}
            
            {/* Camera and Image buttons on right */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handleImageCapture(true)}
                disabled={isProcessing}
                className="p-2 text-foreground hover:text-foreground/80 transition-colors duration-300 disabled:opacity-50"
              >
                {isAnalyzingImage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
              <button 
                onClick={() => handleImageCapture(false)}
                disabled={isProcessing}
                className="p-2 text-foreground hover:text-foreground/80 transition-colors duration-300 disabled:opacity-50"
              >
                <Image className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Event Confirmation Modal */}
      {confirmationModal.resumo && (
        <EventConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={handleCloseConfirmationModal}
          resumo={confirmationModal.resumo}
          onConfirm={handleConfirmEvent}
          onEdit={handleEditEvent}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          event={editingEvent}
          onSave={async () => {
            // Buscar evento atualizado do banco para atualizar o card no chat
            const { data: updatedEvent } = await supabase
              .from('events')
              .select('*')
              .eq('id', editingEvent.id)
              .single();
            
            if (updatedEvent) {
              // Encontrar a mensagem que contém esse evento para atualizar no banco
              const messageToUpdate = messages.find(m => m.eventData?.id === updatedEvent.id);
              
              if (messageToUpdate) {
                // Atualizar metadados no banco de dados para persistência
                const updatedEventData = {
                  ...messageToUpdate.eventData,
                  title: updatedEvent.title,
                  event_date: updatedEvent.event_date,
                  event_time: updatedEvent.event_time,
                  location: updatedEvent.location,
                  description: updatedEvent.description,
                  emoji: updatedEvent.emoji,
                  color: updatedEvent.color,
                  repeat: updatedEvent.repeat,
                  is_all_day: updatedEvent.is_all_day,
                  duration_minutes: updatedEvent.duration_minutes,
                  notification_enabled: updatedEvent.notification_enabled,
                  call_alert_enabled: updatedEvent.call_alert_enabled,
                  priority: updatedEvent.priority,
                  category: updatedEvent.category,
                  status: updatedEvent.status,
                };
                
                await supabase
                  .from('chat_messages')
                  .update({
                    metadata: {
                      eventData: updatedEventData
                    }
                  })
                  .eq('id', messageToUpdate.id);
              }
              
              // Atualizar a mensagem no estado local
              setMessages(prev => prev.map(m => {
                if (m.eventData?.id === updatedEvent.id) {
                  return {
                    ...m,
                    eventData: {
                      ...m.eventData,
                      title: updatedEvent.title,
                      event_date: updatedEvent.event_date,
                      event_time: updatedEvent.event_time,
                      location: updatedEvent.location,
                      description: updatedEvent.description,
                      emoji: updatedEvent.emoji,
                      color: updatedEvent.color,
                      repeat: updatedEvent.repeat,
                      is_all_day: updatedEvent.is_all_day,
                      duration_minutes: updatedEvent.duration_minutes,
                      notification_enabled: updatedEvent.notification_enabled,
                      call_alert_enabled: updatedEvent.call_alert_enabled,
                      priority: updatedEvent.priority,
                      category: updatedEvent.category,
                      status: updatedEvent.status,
                    }
                  };
                }
                return m;
              }));
            }
            
            onEventCreated?.();
          }}
          onDelete={async (deletedEvent) => {
            // Add deleted event message to chat
            const deletedEventData = {
              id: deletedEvent.id,
              title: deletedEvent.title,
              event_date: deletedEvent.event_date,
              event_time: deletedEvent.event_time,
              location: deletedEvent.location,
              category: deletedEvent.category,
            };
            
            const newMessage: Message = {
              id: Date.now().toString(),
              type: 'assistant',
              content: '',
              createdAt: new Date(),
              deletedEventData,
            };
            
            setMessages(prev => [...prev, newMessage]);
            
            // Save to database
            await saveMessage('assistant', '', { deletedEventData });
            
            // Trigger refresh
            onEventCreated?.();
          }}
        />
      )}

      {/* Audio Recording Overlay */}
      <AudioRecordingOverlay
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        transcribedText={transcribedText}
        onCancel={handleCancelAudio}
        onConfirmSend={handleConfirmAudioSend}
        onRetry={handleRetryAudio}
      />

      {/* Weekly Report Modal */}
      {selectedWeeklyReport && (
        <WeeklyReportModal
          isOpen={!!selectedWeeklyReport}
          onClose={() => setSelectedWeeklyReport(null)}
          report={selectedWeeklyReport}
          onOpenSettings={onOpenSettings}
        />
      )}

      {/* Weather Forecast Modal */}
      {selectedWeatherForecast && (
        <WeatherForecastModal
          isOpen={!!selectedWeatherForecast}
          onClose={() => setSelectedWeatherForecast(null)}
          weather={selectedWeatherForecast}
          onOpenSettings={onOpenSettings}
        />
      )}
    </div>
  );
};

export default ChatPage;
