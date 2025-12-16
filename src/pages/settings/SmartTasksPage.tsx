import { ChevronLeft, Sparkles, Brain, Clock, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SmartTasksPage = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [autoReschedule, setAutoReschedule] = useState(true);
  const [contextAware, setContextAware] = useState(true);
  const [learnPatterns, setLearnPatterns] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from profile
  useEffect(() => {
    if (profile) {
      setSmartSuggestions(profile.smart_suggestions_enabled ?? true);
      setAutoReschedule(profile.auto_reschedule_enabled ?? true);
      setContextAware(profile.context_aware_enabled ?? true);
      setLearnPatterns(profile.learn_patterns_enabled ?? true);
    }
  }, [profile]);

  const updatePreference = async (field: string, value: boolean) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id);
      
      if (error) throw error;
      
      await refreshProfile();
    } catch (error) {
      console.error('Error updating preference:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSmartSuggestions = (checked: boolean) => {
    setSmartSuggestions(checked);
    updatePreference('smart_suggestions_enabled', checked);
  };

  const handleAutoReschedule = (checked: boolean) => {
    setAutoReschedule(checked);
    updatePreference('auto_reschedule_enabled', checked);
  };

  const handleContextAware = (checked: boolean) => {
    setContextAware(checked);
    updatePreference('context_aware_enabled', checked);
  };

  const handleLearnPatterns = (checked: boolean) => {
    setLearnPatterns(checked);
    updatePreference('learn_patterns_enabled', checked);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 py-4 safe-area-top flex items-center">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-full bg-kairo-surface-2 flex items-center justify-center z-10 relative"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground -ml-12 pointer-events-none">Tarefas Inteligentes</h1>
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
              <Switch 
                checked={smartSuggestions} 
                onCheckedChange={handleSmartSuggestions}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Reagendamento Automático</p>
                  <p className="text-xs text-muted-foreground">Sugere novos horários para tarefas perdidas</p>
                </div>
              </div>
              <Switch 
                checked={autoReschedule} 
                onCheckedChange={handleAutoReschedule}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Contexto Inteligente</p>
                  <p className="text-xs text-muted-foreground">Entende localização e duração</p>
                </div>
              </div>
              <Switch 
                checked={contextAware} 
                onCheckedChange={handleContextAware}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Repeat className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Aprender Padrões</p>
                  <p className="text-xs text-muted-foreground">Melhora com o tempo</p>
                </div>
              </div>
              <Switch 
                checked={learnPatterns} 
                onCheckedChange={handleLearnPatterns}
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-muted-foreground px-1">
          Seus dados são processados de forma segura. A IA aprende apenas com suas interações dentro do app para melhorar sua experiência.
        </p>
      </div>
    </div>
  );
};

export default SmartTasksPage;
