import { MessageCircle, CheckCircle2, Link2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import FoxIcon from "@/components/icons/FoxIcon";

const WhatsAppPage = () => {
  const isConnected = false;

  const exampleMessages = [
    "Reunião amanhã às 14h",
    "Me lembra de tomar remédio às 22h",
    "O que eu tenho hoje?",
    "Adiar consulta pra sexta",
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold text-foreground">WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Controle tudo por mensagens
        </p>
      </header>

      {/* Connection Status */}
      <section className="px-6 mb-8">
        <div
          className={`rounded-2xl p-6 border ${
            isConnected
              ? "bg-kairo-green/10 border-kairo-green/30"
              : "bg-card border-border"
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isConnected ? "bg-kairo-green/20" : "bg-secondary"
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="w-6 h-6 text-kairo-green" />
              ) : (
                <Link2 className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {isConnected ? "Conectado" : "Não conectado"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isConnected
                  ? "+55 11 99999-9999"
                  : "Conecte seu WhatsApp para começar"}
              </p>
            </div>
          </div>

          <Button
            className={`w-full ${
              isConnected ? "kairo-button-secondary" : "kairo-button-primary"
            }`}
          >
            {isConnected ? "Desconectar" : "Conectar WhatsApp"}
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Como funciona
        </h2>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <FoxIcon size={48} />
            <div>
              <p className="text-foreground font-medium">Kairo</p>
              <p className="text-xs text-muted-foreground">
                Assistente inteligente
              </p>
            </div>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Envie mensagens em linguagem natural e o Kairo entende. Crie,
            edite ou consulte eventos apenas conversando.
          </p>

          {/* Example messages */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
              Exemplos de mensagens
            </p>
            {exampleMessages.map((msg, index) => (
              <div
                key={index}
                className="bg-secondary rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <Send className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm text-foreground">{msg}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          O que você pode fazer
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "📅", label: "Criar eventos" },
            { icon: "✏️", label: "Editar eventos" },
            { icon: "🔔", label: "Receber alertas" },
            { icon: "📋", label: "Listar agenda" },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <span className="text-2xl mb-2 block">{item.icon}</span>
              <p className="text-sm text-foreground font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default WhatsAppPage;
