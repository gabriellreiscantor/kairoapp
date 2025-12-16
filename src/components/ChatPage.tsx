import { useState, useRef, useEffect } from "react";
import { Camera, Image, Mic, Send, Calendar, User } from "lucide-react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import FoxIcon from "./icons/FoxIcon";
import { toast } from "@/hooks/use-toast";

interface ChatPageProps {
  onNavigateToCalendar: () => void;
  onOpenSettings: () => void;
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

const ChatPage = ({ onNavigateToCalendar, onOpenSettings }: ChatPageProps) => {
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

      // Add empty assistant message
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
            // Incomplete JSON, wait for more data
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
      {/* Header with safe area */}
      <header className="flex items-center justify-between px-4 pb-3 safe-area-top">
        <button 
          onClick={onNavigateToCalendar}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <Calendar className="w-5 h-5 text-foreground" />
        </button>
        
        <button 
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <User className="w-5 h-5 text-foreground" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showTimestamp = shouldShowTimestamp(message, prevMessage);
          
          return (
            <div key={message.id}>
              {/* Timestamp */}
              {showTimestamp && (
                <p className="text-center text-[10px] text-muted-foreground my-3">
                  {formatMessageTime(message.createdAt)}
                </p>
              )}
              
              {message.type === 'assistant' ? (
                <div className="mb-4">
                  {/* Show suggestions after first AI message */}
                  {index === 0 && (
                    <div className="bg-kairo-ai-bubble rounded-2xl p-3 mb-3">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                          <FoxIcon size={16} className="text-white" />
                        </div>
                        <p className="text-xs text-muted-foreground pt-2">
                          Você pode tocar em qualquer exemplo abaixo para ver como é fácil criar um compromisso.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {SUGGESTIONS.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion.text)}
                            className="w-full flex items-start gap-2.5 bg-kairo-surface-3 hover:bg-kairo-surface-3/80 rounded-xl px-3 py-2.5 text-left transition-colors"
                          >
                            <span className="text-base">{suggestion.emoji}</span>
                            <span className="text-xs text-foreground leading-relaxed">{suggestion.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI text message */}
                  <p className="text-sm text-foreground leading-relaxed">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-end mb-4">
                  <div className="bg-kairo-user-bubble rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground">{message.content}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input with safe area */}
      <div className="px-4 pb-4 pt-2 safe-area-bottom">
        <div className="bg-kairo-ai-bubble rounded-2xl px-3 py-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Mensagem Kairo"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none py-1.5 mb-1"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <Camera className="w-5 h-5" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <Image className="w-5 h-5" />
              </button>
            </div>
            
            {inputValue ? (
              <button 
                onClick={() => handleSend()}
                disabled={isLoading}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            ) : (
              <button className="w-9 h-9 rounded-full bg-kairo-surface-3 flex items-center justify-center transition-colors">
                <Mic className="w-4 h-4 text-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
