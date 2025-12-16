import { useState, useRef, useEffect } from "react";
import { Camera, Image, Mic, Send, LayoutGrid, Calendar as CalendarIcon } from "lucide-react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import kairoLogo from "@/assets/kairo-logo.png";
import kairoFoxWhite from "@/assets/kairo-fox-white.png";

type ViewType = 'chat' | 'list' | 'calendar';

interface ChatPageProps {
  onNavigateToCalendar: () => void;
  onOpenSettings: () => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const SUGGESTIONS = [
  { emoji: "🍖", text: "Organizar um churrasco com os amigos neste sábado às 13h." },
  { emoji: "🩺", text: "Consulta médica na quarta-feira às 9h." },
  { emoji: "☕", text: "Café com a Sofia amanhã às 16h na padaria." },
  { emoji: "🏆", text: "Comprar ingressos para o jogo do Flamengo neste fim de semana." },
];

const formatMessageTime = (date: Date): string => {
  const time = format(date, 'HH:mm');
  
  if (isToday(date)) {
    return `Hoje ${time}`;
  } else if (isYesterday(date)) {
    return `Ontem ${time}`;
  } else {
    return format(date, "d 'de' MMM HH:mm", { locale: ptBR });
  }
};

const shouldShowTimestamp = (currentMsg: Message, prevMsg: Message | null): boolean => {
  if (!prevMsg) return true;
  const minutesDiff = differenceInMinutes(currentMsg.createdAt, prevMsg.createdAt);
  return minutesDiff >= 5 || currentMsg.type !== prevMsg.type;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const ChatPage = ({ onNavigateToCalendar, onOpenSettings, activeView, onViewChange }: ChatPageProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (userMessage: string, allMessages: Message[]) => {
    setIsLoading(true);
    
    const apiMessages = allMessages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao conectar com a IA");
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar mensagem",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      createdAt: new Date()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    
    await streamChat(messageText, newMessages);
  };

  const handleSuggestionClick = (text: string) => {
    handleSend(text);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl safe-area-top">
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          {/* List View */}
          <button
            onClick={() => onViewChange('list')}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeView === 'list' 
                ? 'bg-primary/20 text-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-kairo-surface-2'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          
          {/* Center - Kairo Logo */}
          <button
            onClick={() => onViewChange('chat')}
            className="w-14 h-14 rounded-full overflow-hidden mx-2 shadow-lg shadow-primary/30 border-2 border-primary/30"
          >
            <img src={kairoLogo} alt="Kairo" className="w-full h-full object-cover" />
          </button>
          
          {/* Calendar View */}
          <button
            onClick={() => onViewChange('calendar')}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeView === 'calendar' 
                ? 'bg-primary/20 text-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-kairo-surface-2'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages - Timeline style */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-24 hide-scrollbar">
        {/* Show suggestions when chat is empty */}
        {messages.length === 0 && (
          <div className="pt-8">
            {/* Welcome message */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-lg shadow-primary/20">
                <img src={kairoFoxWhite} alt="Kairo" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Olá! Toque em qualquer exemplo abaixo para criar um compromisso rapidamente.
                </p>
              </div>
            </div>
            
            {/* Suggestion carousel - horizontal scroll */}
            <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
              <div className="flex gap-2 pb-2">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="flex-shrink-0 w-64 flex items-start gap-2.5 bg-kairo-surface-2 hover:bg-kairo-surface-3 border border-border/20 rounded-2xl px-4 py-3 text-left transition-all duration-300 hover:border-primary/20"
                  >
                    <span className="text-lg">{suggestion.emoji}</span>
                    <span className="text-xs text-foreground/90 leading-relaxed line-clamp-2">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
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
                  <div className="flex items-start gap-3 mb-4 pl-1">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow-sm z-10">
                      <img src={kairoFoxWhite} alt="Kairo" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm text-foreground leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end mb-4 pl-12">
                    <div className="bg-primary/20 border border-primary/30 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-foreground">{message.content}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
            placeholder="Digite uma mensagem..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none py-1 mb-2"
          />
          
          <div className="flex items-center justify-between">
            {/* Mic button on left */}
            {inputValue ? (
              <button 
                onClick={() => handleSend()}
                disabled={isLoading}
                className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/30 golden-ripple"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            ) : (
              <button className="w-10 h-10 rounded-full bg-kairo-surface-3 flex items-center justify-center transition-all duration-300 hover:bg-kairo-surface-2">
                <Mic className="w-4 h-4 text-foreground" />
              </button>
            )}
            
            {/* Camera and Image buttons on right - always orange */}
            <div className="flex items-center gap-1">
              <button className="p-2 text-foreground hover:text-foreground/80 transition-colors duration-300">
                <Camera className="w-5 h-5" />
              </button>
              <button className="p-2 text-foreground hover:text-foreground/80 transition-colors duration-300">
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