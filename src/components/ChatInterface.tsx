import { useState } from "react";
import { X, Camera, Image, Mic, Send } from "lucide-react";
import FoxIcon from "./icons/FoxIcon";

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  { emoji: "🍖", text: "Organizar um churrasco com os amigos neste sábado às 13h" },
  { emoji: "🩺", text: "Consulta médica na quarta-feira às 9h" },
  { emoji: "💊", text: "Me lembra de tomar remédio às 22h" },
  { emoji: "✈️", text: "Viagem para São Paulo semana que vem" },
];

const ChatInterface = ({ isOpen, onClose }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Olá! Sou o Kairo, seu assistente de agenda. Como posso te ajudar hoje?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    
    // Simulate AI response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '✅ Entendido! Vou criar esse evento para você.'
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col animate-slide-up">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <FoxIcon size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Kairo</h2>
            <p className="text-xs text-muted-foreground">Assistente inteligente</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center transition-colors hover:bg-kairo-surface-3"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-2xl px-4 py-3
                ${message.type === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-kairo-surface-2 text-foreground rounded-bl-sm'
                }
              `}
            >
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="pt-4">
            <p className="text-xs text-muted-foreground mb-3">Sugestões rápidas:</p>
            <div className="space-y-2">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="w-full flex items-center gap-3 bg-kairo-surface-2 hover:bg-kairo-surface-3 rounded-2xl px-4 py-3 text-left transition-colors"
                >
                  <span className="text-xl">{suggestion.emoji}</span>
                  <span className="text-sm text-foreground">{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2 safe-area-bottom">
        <div className="flex items-center gap-2 bg-kairo-surface-2 rounded-full px-4 py-2">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Camera className="w-5 h-5" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Image className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Mensagem Kairo"
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none py-2"
          />
          
          {inputValue ? (
            <button 
              onClick={handleSend}
              className="p-2 text-primary hover:text-primary/80 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
