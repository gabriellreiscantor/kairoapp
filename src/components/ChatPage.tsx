import { useState, useRef, useEffect } from "react";
import { Camera, Image, Mic, Send, Calendar as CalendarIcon, User, Loader2 } from "lucide-react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useImageCapture } from "@/hooks/useImageCapture";
import { useOnboarding } from "@/hooks/useOnboarding";
import kairoLogo from "@/assets/kairo-logo.png";
import kairoFoxWhite from "@/assets/kairo-fox-white.png";
import kairoFoxColor from "@/assets/kairo-fox-color.png";
import EventCreatedCard from "@/components/chat/EventCreatedCard";
import OnboardingSuggestionCard from "@/components/chat/OnboardingSuggestionCard";

type ViewType = 'chat' | 'list' | 'calendar';

interface ChatPageProps {
  onNavigateToCalendar: () => void;
  onOpenSettings: () => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onEventCreated?: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  actions?: ExecutedAction[];
  imagePreview?: string;
  eventData?: any; // For showing event cards
  suggestionCard?: 'weekly_planning' | 'connect_calendar'; // For onboarding suggestions
}

interface ExecutedAction {
  action: string;
  success: boolean;
  data?: any;
  error?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TRANSCRIBE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;
const ANALYZE_IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`;

// Onboarding messages
const ONBOARDING_WELCOME = `Estou aqui para te ajudar a criar seu primeiro lembrete ou compromisso.

Assim você não precisa guardar tudo na cabeça.

Pode ser qualquer coisa — me conta o que você gostaria de lembrar.`;

const ONBOARDING_FIRST_EVENT_SUCCESS = `Excelente! Você acabou de criar seu primeiro lembrete no Kairo.

A partir de agora, o Kairo cuida disso pra você.`;

const ChatPage = ({ onNavigateToCalendar, onOpenSettings, activeView, onViewChange, onEventCreated }: ChatPageProps) => {
  const { user, session } = useAuth();
  const { resolvedTheme } = useTheme();
  const { t, getDateLocale } = useLanguage();
  const { toast } = useToast();
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
  
  const kairoFox = resolvedTheme === 'dark' ? kairoFoxWhite : kairoFoxColor;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [showWeeklySuggestion, setShowWeeklySuggestion] = useState(false);
  const [showCalendarSuggestion, setShowCalendarSuggestion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const dateLocale = getDateLocale();

  // Get user display name for personalized messages
  const [displayName, setDisplayName] = useState<string>('');
  
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

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;

        if (data) {
          const loadedMessages: Message[] = data.map((m: any) => ({
            id: m.id,
            type: m.role as 'user' | 'assistant',
            content: m.content,
            createdAt: new Date(m.created_at),
          }));
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [user]);

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;

    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role,
        content,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const streamChat = async (userMessage: string, allMessages: Message[], imageAnalysis?: any) => {
    setIsLoading(true);
    
    const apiMessages = allMessages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    let executedActions: ExecutedAction[] = [];

    try {
      console.log('[ChatPage] Starting chat request to:', CHAT_URL);
      console.log('[ChatPage] Messages being sent:', apiMessages.length);
      console.log('[ChatPage] Onboarding step:', onboardingStep);
      
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          imageAnalysis,
          isOnboarding: isInOnboarding,
          onboardingStep,
        }),
      });

      console.log('[ChatPage] Response status:', response.status);
      console.log('[ChatPage] Response ok:', response.ok);

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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              // Check for action metadata
              const actionMatch = content.match(/<!--KAIRO_ACTIONS:(.+?)-->/);
              if (actionMatch) {
                try {
                  executedActions = JSON.parse(actionMatch[1]);
                  console.log('[ChatPage] Actions parsed:', executedActions);
                  const cleanContent = content.replace(/<!--KAIRO_ACTIONS:.+?-->\n?/, '');
                  if (cleanContent) {
                    assistantContent += cleanContent;
                    
                    // Check if event was created to show event card
                    const eventAction = executedActions.find(a => a.action === 'criar_evento' && a.success);
                    
                    setMessages(prev => prev.map(m => 
                      m.id === assistantId ? { 
                        ...m, 
                        content: assistantContent, 
                        actions: executedActions,
                        eventData: eventAction?.data 
                      } : m
                    ));
                  }
                } catch (e) {
                  console.error('[ChatPage] Error parsing actions:', e);
                }
              } else {
                assistantContent += content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, content: assistantContent, actions: executedActions.length > 0 ? executedActions : undefined } : m
                ));
              }
            }
          } catch (parseError) {
            console.error('[ChatPage] JSON parse error:', parseError);
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message after streaming completes
      if (assistantContent) {
        await saveMessage('assistant', assistantContent);
      }

      // Handle executed actions
      for (const action of executedActions) {
        if (action.success) {
          if (action.action === 'criar_evento') {
            onEventCreated?.();
            
            // Check if this is first event during onboarding
            if (isInOnboarding && (onboardingStep === 'welcome' || onboardingStep === 'guiding')) {
              await markFirstEventCreated();
              
              // Show success message and event card
              const eventCardMessage: Message = {
                id: `event-card-${Date.now()}`,
                type: 'assistant',
                content: ONBOARDING_FIRST_EVENT_SUCCESS,
                createdAt: new Date(),
                eventData: action.data,
              };
              setMessages(prev => [...prev, eventCardMessage]);
              await saveMessage('assistant', ONBOARDING_FIRST_EVENT_SUCCESS);
              
              // After a short delay, show weekly planning suggestion
              setTimeout(() => {
                setShowWeeklySuggestion(true);
                setOnboardingStep('suggest_weekly');
              }, 2000);
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
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao conectar",
        variant: "destructive",
      });
    } finally {
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
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    
    await saveMessage('user', messageText);
    await streamChat(messageText, newMessages);
  };

  const handleSuggestionClick = (text: string) => {
    handleSend(text);
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
    toast({
      title: "Em breve",
      description: "A conexão com calendários estará disponível em breve!",
    });
    completeOnboarding();
  };

  const handleSkipCalendarConnection = () => {
    setShowCalendarSuggestion(false);
    completeOnboarding();
  };

  // AUDIO RECORDING
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
          // Send transcribed text to chat
          await handleSend(result.text);
        }
      } catch (error) {
        console.error('Transcription error:', error);
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro ao transcrever áudio",
          variant: "destructive",
        });
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      try {
        await startRecording();
      } catch (error) {
        console.error('Recording error:', error);
        toast({
          title: "Erro",
          description: "Não foi possível acessar o microfone",
          variant: "destructive",
        });
      }
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

      // Add user message with image preview
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: '📷 Imagem enviada',
        createdAt: new Date(),
        imagePreview: `data:${imageData.mimeType};base64,${imageData.base64}`,
      };
      
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      await saveMessage('user', '[Imagem enviada]');

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

      // Send analysis to chat for response
      await streamChat(analysisResult.pergunta_usuario || 'Analisei a imagem', newMessages, analysisResult);

    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao analisar imagem",
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl safe-area-top">
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          {/* Calendar View - Left */}
          <button
            onClick={() => onViewChange('calendar')}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          
          {/* Center - Kairo Logo */}
          <button
            onClick={() => onViewChange('chat')}
            className="w-14 h-14 rounded-full overflow-hidden mx-2 shadow-lg shadow-primary/30 border-2 border-primary/30"
          >
            <img src={kairoLogo} alt="Kairo" className="w-full h-full object-cover" />
          </button>
          
          {/* Settings - Right */}
          <button
            onClick={onOpenSettings}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages - Timeline style */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-24 hide-scrollbar">
        {/* Loading history indicator */}
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
                <img src={kairoFox} alt="Kairo" className="w-full h-full object-cover" />
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
                    <div className="flex items-start gap-3 pl-1">
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow-sm z-10">
                        <img src={kairoFox} alt="Kairo" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                    
                    {/* Event Card */}
                    {message.eventData && (
                      <div className="pl-9">
                        <EventCreatedCard event={message.eventData} />
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
                    <div className="bg-primary/20 border border-primary/30 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-foreground">{message.content}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 mb-4 pl-1">
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow-sm z-10">
                <img src={kairoFox} alt="Kairo" className="w-full h-full object-cover" />
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

      {/* Input with safe area */}
      <div className="px-4 pb-4 pt-2 safe-area-bottom">
        <div className="glass border border-border/20 rounded-2xl px-4 py-3">
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
    </div>
  );
};

export default ChatPage;
