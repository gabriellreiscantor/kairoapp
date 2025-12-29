import { Sparkles, Brain, Clock, Repeat, CloudSun, BarChart3, MapPin, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { useLanguage } from "@/contexts/LanguageContext";

const HOURS = [
  { value: 5, label: '05:00' },
  { value: 6, label: '06:00' },
  { value: 7, label: '07:00' },
  { value: 8, label: '08:00' },
  { value: 9, label: '09:00' },
  { value: 10, label: '10:00' },
  { value: 11, label: '11:00' },
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

const WEATHER_HOURS = [
  { value: 5, label: '05:00' },
  { value: 6, label: '06:00' },
  { value: 7, label: '07:00' },
  { value: 8, label: '08:00' },
  { value: 9, label: '09:00' },
  { value: 10, label: '10:00' },
  { value: 11, label: '11:00' },
  { value: 12, label: '12:00' },
];

const SmartTasksPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { getCurrentAddress, requestLocationPermission, error: locationError, permissionStatus } = useGeolocation();
  const { t } = useLanguage();
  
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [autoReschedule, setAutoReschedule] = useState(true);
  const [contextAware, setContextAware] = useState(true);
  const [learnPatterns, setLearnPatterns] = useState(true);
  const [weatherForecast, setWeatherForecast] = useState(false);
  const [weatherHour, setWeatherHour] = useState(7);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [weeklyReportHour, setWeeklyReportHour] = useState(12);
  const [isSaving, setIsSaving] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  // Load preferences from profile
  useEffect(() => {
    if (profile) {
      setSmartSuggestions(profile.smart_suggestions_enabled ?? true);
      setAutoReschedule(profile.auto_reschedule_enabled ?? true);
      setContextAware(profile.context_aware_enabled ?? true);
      setLearnPatterns(profile.learn_patterns_enabled ?? true);
      setWeatherForecast(profile.weather_forecast_enabled ?? false);
      setWeatherHour((profile as any).weather_forecast_hour ?? 7);
      setWeeklyReport((profile as any).weekly_report_enabled ?? true);
      setWeeklyReportHour((profile as any).weekly_report_hour ?? 12);
      setUserCity((profile as any).user_city ?? null);
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

  const handleWeatherForecast = async (checked: boolean) => {
    if (checked) {
      // Check if we already have location
      const hasLocation = (profile as any)?.user_latitude && (profile as any)?.user_longitude;
      
      if (!hasLocation) {
        // First request permission explicitly
        setIsCapturingLocation(true);
        
        try {
          // This triggers the native iOS/Android permission popup
          const hasPermission = await requestLocationPermission();
          
          if (!hasPermission) {
            // Permission denied - show appropriate message
            if (permissionStatus === 'denied') {
              toast.error(t('smartTasks.locationDenied'));
            } else {
              toast.error(t('smartTasks.locationNeeded'));
            }
            setIsCapturingLocation(false);
            return;
          }
          
          // Permission granted - now get the address
          const address = await getCurrentAddress();
          
          if (address) {
            // Get city with proper format using reverse geocode
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${address.lat}&lon=${address.lon}&format=json&addressdetails=1&zoom=10`,
              { headers: { 'Accept-Language': 'pt-BR' } }
            );
            
            let cityName = 'Sua cidade';
            
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              const STATE_ABBR: Record<string, string> = {
                'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
                'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
                'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
                'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
                'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
                'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
                'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
              };
              
              const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.municipality;
              const state = geoData.address?.state || '';
              const stateAbbr = STATE_ABBR[state] || state.substring(0, 2).toUpperCase();
              
              if (city) {
                cityName = stateAbbr ? `${city}, ${stateAbbr}` : city;
              }
            }
            
            // Save location to profile
            const { error } = await supabase
              .from('profiles')
              .update({
                weather_forecast_enabled: true,
                user_latitude: address.lat,
                user_longitude: address.lon,
                user_city: cityName
              })
              .eq('id', user?.id);
            
            if (error) throw error;
            
            setUserCity(cityName);
            setWeatherForecast(true);
            toast.success(`${t('smartTasks.locationCaptured')} ${cityName}`);
            await refreshProfile();
          } else {
            toast.error(locationError || t('smartTasks.locationUpdateError'));
          }
        } catch (error) {
          console.error('Error capturing location:', error);
          toast.error(t('smartTasks.locationError'));
        } finally {
          setIsCapturingLocation(false);
        }
      } else {
        // Already has location - just enable
        setWeatherForecast(true);
        updatePreference('weather_forecast_enabled', true);
      }
    } else {
      setWeatherForecast(false);
      updatePreference('weather_forecast_enabled', false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!user) return;
    
    setIsCapturingLocation(true);
    try {
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        toast.error(t('smartTasks.locationUpdateDenied'));
        return;
      }
      
      const address = await getCurrentAddress();
      
      if (address) {
        // Get city with proper format using reverse geocode
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${address.lat}&lon=${address.lon}&format=json&addressdetails=1&zoom=10`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        
        let cityName = 'Sua cidade';
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          const STATE_ABBR: Record<string, string> = {
            'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
            'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
            'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
            'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
            'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
            'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
            'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
          };
          
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.municipality;
          const state = geoData.address?.state || '';
          const stateAbbr = STATE_ABBR[state] || state.substring(0, 2).toUpperCase();
          
          if (city) {
            cityName = stateAbbr ? `${city}, ${stateAbbr}` : city;
          }
        }
        
        const { error } = await supabase
          .from('profiles')
          .update({
            user_latitude: address.lat,
            user_longitude: address.lon,
            user_city: cityName
          })
          .eq('id', user.id);
        
        if (error) throw error;
        
        setUserCity(cityName);
        toast.success(`${t('smartTasks.locationUpdated')} ${cityName}`);
        await refreshProfile();
      } else {
        toast.error(t('smartTasks.locationUpdateError'));
      }
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error(t('smartTasks.locationUpdateFailed'));
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleWeatherHourChange = (hour: number) => {
    setWeatherHour(hour);
    updatePreference('weather_forecast_hour', hour);
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
        <h1 className="text-xl font-bold text-foreground">{t('smartTasks.title')}</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Info Card */}
        <div className="gradient-primary rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-white font-semibold">{t('smartTasks.aiTitle')}</h2>
          </div>
          <p className="text-white/80 text-sm">
            {t('smartTasks.aiDesc')}
          </p>
        </div>

        {/* Smart Features */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {t('smartTasks.features')}
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">{t('smartTasks.suggestions')}</p>
                  <p className="text-xs text-muted-foreground">{t('smartTasks.suggestionsDesc')}</p>
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
                  <p className="text-foreground">{t('smartTasks.autoReschedule')}</p>
                  <p className="text-xs text-muted-foreground">{t('smartTasks.autoRescheduleDesc')}</p>
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
                  <p className="text-foreground">{t('smartTasks.context')}</p>
                  <p className="text-xs text-muted-foreground">{t('smartTasks.contextDesc')}</p>
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
                  <p className="text-foreground">{t('smartTasks.patterns')}</p>
                  <p className="text-xs text-muted-foreground">{t('smartTasks.patternsDesc')}</p>
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
                  {isCapturingLocation ? (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  ) : (
                    <CloudSun className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-foreground">{t('smartTasks.weather')}</p>
                    <p className="text-xs text-muted-foreground">
                      {isCapturingLocation 
                        ? t('smartTasks.capturingLocation')
                        : t('smartTasks.weatherDesc')}
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={weatherForecast} 
                  onCheckedChange={handleWeatherForecast}
                  disabled={isSaving || isCapturingLocation}
                />
              </div>
              
              {/* Hour Picker and Location - Only visible when enabled */}
              {weatherForecast && (
                <div className="mt-3 ml-8 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{t('smartTasks.time')}</span>
                    <select
                      value={weatherHour}
                      onChange={(e) => handleWeatherHourChange(Number(e.target.value))}
                      className="bg-kairo-surface-3 border border-border/20 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isSaving}
                    >
                      {WEATHER_HOURS.map(hour => (
                        <option key={hour.value} value={hour.value}>
                          {hour.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {userCity && (
                    <button
                      onClick={handleUpdateLocation}
                      disabled={isCapturingLocation}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isCapturingLocation ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5" />
                      )}
                      <span>{userCity}</span>
                      <span className="text-primary underline">{t('smartTasks.updateLocation')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Weekly Report */}
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-foreground">{t('smartTasks.weeklyReport')}</p>
                    <p className="text-xs text-muted-foreground">{t('smartTasks.weeklyReportDesc')}</p>
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
                  <span className="text-sm text-muted-foreground">{t('smartTasks.time')}</span>
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
          {t('smartTasks.privacyNote')}
        </p>
      </div>
    </div>
  );
};

export default SmartTasksPage;
