import { ChevronLeft, ChevronRight, MessageCircle, Mail, Book, Video, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQ = [
  {
    question: "Como criar um evento via WhatsApp?",
    answer: "Basta enviar uma mensagem para o número do Kairo descrevendo seu compromisso em linguagem natural, como 'Reunião amanhã às 14h'."
  },
  {
    question: "O que é o recurso 'Me Ligue'?",
    answer: "É uma chamada simulada que o Kairo faz para você quando um evento importante está prestes a começar, garantindo que você não perca."
  },
  {
    question: "Como funcionam os alertas críticos?",
    answer: "Alertas críticos ignoram o modo silencioso e 'Não Perturbe' do seu dispositivo para garantir que você receba notificações importantes."
  },
  {
    question: "Posso sincronizar com outros calendários?",
    answer: "Sim! Você pode conectar o Google Calendar, Apple Calendar e Outlook nas configurações de calendários."
  },
];

const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Ajuda</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Contact Support */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Fale Conosco
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground text-left">Chat ao Vivo</p>
                  <p className="text-xs text-muted-foreground">Resposta em até 5 minutos</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground text-left">E-mail</p>
                  <p className="text-xs text-muted-foreground">suporte@kairo.app</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Resources */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Recursos
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Book className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Guia do Usuário</span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Tutoriais em Vídeo</span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Perguntas Frequentes
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, index) => (
              <div key={index} className="bg-kairo-surface-2 rounded-2xl p-4">
                <h3 className="text-foreground font-medium mb-2">{item.question}</h3>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
