import { Sparkles, Brain, Clock, Repeat, CloudSun, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BackButton from "@/components/BackButton";

const HOURS = [
  { value: 12, label: '12:00' },
  { value: 13, label: '13:00' },
  { value: 14, label: '14:00' },
  { value: 15, label: '15:00' },
  { value: 16, label: '16:00' },
  { value: 17, label: '17:00' },
  { value: 18, label: '18:00' },
  { value: 19, label: '19:00' },
  { value: 20, label: '20:00' },
  { value: 21, label: '21:00' },
];

const SmartTasksPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [autoReschedule, setAutoReschedule] = useState(true);
  const [contextAware, setContextAware] = useState(true);
  const [learnPatterns, setLearnPatterns] = useState(true);
  const [weatherForecast, setWeatherForecast] = useState(false);
  const [weatherTime, setWeatherTime] = useState("07:00");
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [weeklyReportHour, setWeeklyReportHour] = useState(12);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from profile
  useEffect(() => {
    if (profile) {
      setSmartSuggestions(profile.smart_suggestions_enabled ?? true);
      setAutoReschedule(profile.auto_reschedule_enabled ?? true);
      setContextAware(profile.context_aware_enabled ?? true);
      setLearnPatterns(profile.learn_patterns_enabled ?? true);
      setWeatherForecast(profile.weather_forecast_enabled ?? false);
      setWeatherTime(profile.weather_forecast_time ?? "07:00");
      setWeeklyReport((profile as any).weekly_report_enabled ?? true);
      setWeeklyReportHour((profile as any).weekly_report_hour ?? 12);
    }
  }, [profile]);

  const updatePreference = async (field: string, value: boolean | string | number) => {
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

  const handleWeatherForecast = (checked: boolean) => {
    setWeatherForecast(checked);
    updatePreference('weather_forecast_enabled', checked);
  };

  const handleWeatherTimeChange = (time: string) => {
    setWeatherTime(time);
    updatePreference('weather_forecast_time', time);
  };

  const handleWeeklyReport = (checked: boolean) => {
    setWeeklyReport(checked);
    updatePreference('weekly_report_enabled', checked);
  };

  const handleWeeklyReportHourChange = (hour: number) => {
    setWeeklyReportHour(hour);
    updatePreference('weekly_report_hour', hour);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 py-4 safe-area-top flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">Ações Inteligentes</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Info Card */}
        <div className="gradient-primary rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-white font-semibold">IA do Horah</h2>
          </div>
          <p className="text-white/80 text-sm">
            O Horah usa inteligência artificial para aprender seus padrões e sugerir o melhor momento para cada tarefa.
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

            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
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

            {/* Weather Forecast */}
            <div className="px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CloudSun className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-foreground">Previsão do Tempo Matinal</p>
                    <p className="text-xs text-muted-foreground">Receba a previsão diariamente no chat</p>
                  </div>
                </div>
                <Switch 
                  checked={weatherForecast} 
                  onCheckedChange={handleWeatherForecast}
                  disabled={isSaving}
                />
              </div>
              
              {/* Time Picker - Only visible when enabled */}
              {weatherForecast && (
                <div className="mt-3 ml-8 flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Horário:</span>
                  <input
                    type="time"
                    value={weatherTime}
                    onChange={(e) => handleWeatherTimeChange(e.target.value)}
                    className="bg-kairo-surface-3 border border-border/20 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>

            {/* Weekly Report */}
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-foreground">Resumo Semanal</p>
                    <p className="text-xs text-muted-foreground">Relatório inteligente todo domingo</p>
                  </div>
                </div>
                <Switch 
                  checked={weeklyReport} 
                  onCheckedChange={handleWeeklyReport}
                  disabled={isSaving}
                />
              </div>
              
              {/* Hour Picker - Only visible when enabled */}
              {weeklyReport && (
                <div className="mt-3 ml-8 flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Horário:</span>
                  <select
                    value={weeklyReportHour}
                    onChange={(e) => handleWeeklyReportHourChange(Number(e.target.value))}
                    className="bg-kairo-surface-3 border border-border/20 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isSaving}
                  >
                    {HOURS.map(hour => (
                      <option key={hour.value} value={hour.value}>
                        {hour.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-muted-foreground px-1">
          Seus dados são processados de forma segura. A IA aprende apenas com suas interações dentro do app para melhorar sua experiência. O horário é baseado no fuso do seu dispositivo.
        </p>
      </div>
    </div>
  );
};

export default SmartTasksPage;
