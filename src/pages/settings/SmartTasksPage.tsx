import { ChevronLeft, Sparkles, Brain, Clock, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

const SmartTasksPage = () => {
  const navigate = useNavigate();
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [autoReschedule, setAutoReschedule] = useState(true);
  const [contextAware, setContextAware] = useState(true);
  const [learnPatterns, setLearnPatterns] = useState(true);

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
        <h1 className="text-xl font-bold text-foreground">Tarefas Inteligentes</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Info Card */}
        <div className="gradient-primary rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-white font-semibold">IA do Kairo</h2>
          </div>
          <p className="text-white/80 text-sm">
            O Kairo usa inteligência artificial para aprender seus padrões e sugerir o melhor momento para cada tarefa.
          </p>
        </div>

        {/* Smart Features */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Recursos Inteligentes
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Sugestões Inteligentes</p>
                  <p className="text-xs text-muted-foreground">Sugestões baseadas no seu histórico</p>
                </div>
              </div>
              <Switch checked={smartSuggestions} onCheckedChange={setSmartSuggestions} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Reagendamento Automático</p>
                  <p className="text-xs text-muted-foreground">Sugere novos horários para tarefas perdidas</p>
                </div>
              </div>
              <Switch checked={autoReschedule} onCheckedChange={setAutoReschedule} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Contexto Inteligente</p>
                  <p className="text-xs text-muted-foreground">Entende localização e duração</p>
                </div>
              </div>
              <Switch checked={contextAware} onCheckedChange={setContextAware} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Repeat className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Aprender Padrões</p>
                  <p className="text-xs text-muted-foreground">Melhora com o tempo</p>
                </div>
              </div>
              <Switch checked={learnPatterns} onCheckedChange={setLearnPatterns} />
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-muted-foreground px-1">
          Seus dados são processados localmente e nunca compartilhados. A IA aprende apenas com suas interações dentro do app.
        </p>
      </div>
    </div>
  );
};

export default SmartTasksPage;
