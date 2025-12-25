import React from "react";
import { format, parseISO } from "date-fns";
import { ptBR, enUS, es, fr, ja, ko, zhCN } from "date-fns/locale";
import { X, Share2, Settings, Droplets, Wind, MapPin, Thermometer, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Umbrella, Shirt, Glasses } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

interface WeatherData {
  temperature: number;
  temperatureMax: number;
  temperatureMin: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  city: string;
  date: string;
  hourlyForecast?: Array<{
    time: string;
    temperature: number;
    weatherCode: number;
  }>;
  tips?: string[];
}

interface WeatherForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: WeatherData;
  onOpenSettings?: () => void;
}

// Weather code to gradient mapping (same as WeatherForecastCard)
const getWeatherGradient = (code: number): string => {
  // Céu limpo / Ensolarado - tons quentes amarelo/laranja/rosa
  if (code === 0) {
    return 'linear-gradient(135deg, #f6d365 0%, #fda085 50%, #f5576c 100%)';
  }
  // Nublado - cinza azulado
  if (code >= 1 && code <= 3) {
    return 'linear-gradient(135deg, #89a8b8 0%, #667085 50%, #4a5568 100%)';
  }
  // Nevoeiro - cinza suave
  if (code >= 45 && code <= 48) {
    return 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%)';
  }
  // Garoa / Chuva leve - azul/roxo
  if (code >= 51 && code <= 55) {
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6366f1 100%)';
  }
  // Chuva - azul escuro
  if (code >= 56 && code <= 82) {
    return 'linear-gradient(135deg, #1e3a5f 0%, #3b5998 50%, #4f46e5 100%)';
  }
  // Neve - azul gelo/ciano
  if (code >= 71 && code <= 77) {
    return 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 50%, #38bdf8 100%)';
  }
  // Tempestade - roxo escuro dramático
  if (code >= 95 && code <= 99) {
    return 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)';
  }
  // Default (ensolarado)
  return 'linear-gradient(135deg, #f6d365 0%, #fda085 50%, #f5576c 100%)';
};

// Weather code to icon mapping (WMO codes)
const getWeatherIcon = (code: number, size: string = "w-6 h-6") => {
  if (code === 0) return <Sun className={`${size} text-yellow-400`} />;
  if (code >= 1 && code <= 3) return <Cloud className={`${size} text-gray-300`} />;
  if (code >= 45 && code <= 48) return <CloudFog className={`${size} text-gray-400`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${size} text-blue-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-500`} />;
  if (code >= 95 && code <= 99) return <CloudLightning className={`${size} text-yellow-500`} />;
  return <Sun className={`${size} text-yellow-400`} />;
};

const getWeatherDescription = (code: number, lang: string): string => {
  const descriptions: Record<string, Record<string, string>> = {
    'pt-BR': {
      clear: 'Céu limpo',
      cloudy: 'Nublado',
      fog: 'Nevoeiro',
      drizzle: 'Garoa',
      rain: 'Chuva',
      snow: 'Neve',
      thunderstorm: 'Tempestade'
    },
    'en-US': {
      clear: 'Clear sky',
      cloudy: 'Cloudy',
      fog: 'Foggy',
      drizzle: 'Drizzle',
      rain: 'Rain',
      snow: 'Snow',
      thunderstorm: 'Thunderstorm'
    },
    'es-ES': {
      clear: 'Cielo despejado',
      cloudy: 'Nublado',
      fog: 'Niebla',
      drizzle: 'Llovizna',
      rain: 'Lluvia',
      snow: 'Nieve',
      thunderstorm: 'Tormenta'
    }
  };

  const langDescriptions = descriptions[lang] || descriptions['pt-BR'];
  
  if (code === 0) return langDescriptions.clear;
  if (code >= 1 && code <= 3) return langDescriptions.cloudy;
  if (code >= 45 && code <= 48) return langDescriptions.fog;
  if (code >= 51 && code <= 55) return langDescriptions.drizzle;
  if (code >= 56 && code <= 82) return langDescriptions.rain;
  if (code >= 71 && code <= 77) return langDescriptions.snow;
  if (code >= 95 && code <= 99) return langDescriptions.thunderstorm;
  return langDescriptions.clear;
};

// Generate weather tips based on conditions
const generateTips = (weather: WeatherData, lang: string): { icon: React.ReactNode; tip: string }[] => {
  const tips: { icon: React.ReactNode; tip: string }[] = [];
  
  // Rain tips
  if (weather.weatherCode >= 51 && weather.weatherCode <= 82) {
    tips.push({
      icon: <Umbrella className="w-4 h-4 text-blue-400" />,
      tip: lang === 'en-US' ? 'Take an umbrella!' : lang === 'es-ES' ? '¡Lleva un paraguas!' : 'Leve um guarda-chuva!'
    });
  }
  
  // Hot weather tips
  if (weather.temperatureMax > 30) {
    tips.push({
      icon: <Glasses className="w-4 h-4 text-yellow-400" />,
      tip: lang === 'en-US' ? 'Use sunscreen and stay hydrated' : lang === 'es-ES' ? 'Usa protector solar y mantente hidratado' : 'Use protetor solar e mantenha-se hidratado'
    });
  }
  
  // Cold weather tips
  if (weather.temperatureMin < 15) {
    tips.push({
      icon: <Shirt className="w-4 h-4 text-purple-400" />,
      tip: lang === 'en-US' ? 'Dress warmly, it will be cold!' : lang === 'es-ES' ? '¡Abrígate, hará frío!' : 'Vista-se bem, vai esfriar!'
    });
  }
  
  // Windy tips
  if (weather.windSpeed > 30) {
    tips.push({
      icon: <Wind className="w-4 h-4 text-gray-400" />,
      tip: lang === 'en-US' ? 'Strong winds expected' : lang === 'es-ES' ? 'Se esperan vientos fuertes' : 'Ventos fortes esperados'
    });
  }
  
  // Clear sky tip
  if (weather.weatherCode === 0 && tips.length === 0) {
    tips.push({
      icon: <Sun className="w-4 h-4 text-yellow-400" />,
      tip: lang === 'en-US' ? 'Perfect day to go outside!' : lang === 'es-ES' ? '¡Día perfecto para salir!' : 'Dia perfeito para sair!'
    });
  }
  
  return tips;
};

const WeatherForecastModal: React.FC<WeatherForecastModalProps> = ({ 
  isOpen, 
  onClose, 
  weather,
  onOpenSettings 
}) => {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const getLocale = () => {
    switch (language) {
      case 'en-US': return enUS;
      case 'es-ES': return es;
      case 'fr-FR': return fr;
      case 'ja-JP': return ja;
      case 'ko-KR': return ko;
      case 'zh-CN': return zhCN;
      default: return ptBR;
    }
  };

  const formatDate = () => {
    try {
      const date = parseISO(weather.date);
      const locale = getLocale();
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale });
    } catch {
      return weather.date;
    }
  };

  const handleShare = async () => {
    try {
      const shareText = `🌤️ Previsão para ${weather.city}\n\n🌡️ ${Math.round(weather.temperature)}°C (${Math.round(weather.temperatureMin)}° - ${Math.round(weather.temperatureMax)}°)\n${getWeatherDescription(weather.weatherCode, language)}\n\n💧 Umidade: ${weather.humidity}%\n💨 Vento: ${Math.round(weather.windSpeed)} km/h\n\nGerado pelo Horah`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Previsão do Tempo - ${weather.city}`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getSettingsHint = () => {
    switch (language) {
      case 'en-US': return 'Set your weather forecast time in Settings → Smart Actions.';
      case 'es-ES': return 'Configura el horario del pronóstico en Configuración → Acciones Inteligentes.';
      default: return 'Configure o horário da previsão em Configurações → Ações Inteligentes.';
    }
  };

  const tips = generateTips(weather, language);

  // Use dynamic gradient based on weather code (same as card)
  const gradientStyle = getWeatherGradient(weather.weatherCode);

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh] bg-background border-border">
        {/* Drag handle bar */}
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mt-4" />
        
        <div className="overflow-y-auto max-h-[85vh]">
          {/* Header with gradient */}
          <div 
            className="relative p-6 pb-8 mt-2"
            style={{ background: gradientStyle }}
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            
            {/* Location */}
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-white/80" />
              <span className="text-white font-medium">{weather.city}</span>
            </div>
            
            <p className="text-white/70 text-sm mb-4 capitalize">
              {formatDate()}
            </p>
            
            {/* Main temperature */}
            <div className="flex items-center gap-6">
              {getWeatherIcon(weather.weatherCode, "w-20 h-20")}
              <div>
                <p className="text-white text-6xl font-bold">
                  {Math.round(weather.temperature)}°
                </p>
                <p className="text-white/80 text-lg">
                  {getWeatherDescription(weather.weatherCode, language)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Temperature range */}
            <div className="flex items-center justify-center gap-8 py-4">
              <div className="text-center">
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  {language === 'en-US' ? 'Min' : 'Mínima'}
                </p>
                <p className="text-foreground text-3xl font-bold text-blue-500">
                  {Math.round(weather.temperatureMin)}°
                </p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  {language === 'en-US' ? 'Max' : 'Máxima'}
                </p>
                <p className="text-foreground text-3xl font-bold text-red-500">
                  {Math.round(weather.temperatureMax)}°
                </p>
              </div>
            </div>
            
            {/* Additional details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-xl p-4 flex items-center gap-3">
                <Droplets className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase">
                    {language === 'en-US' ? 'Humidity' : 'Umidade'}
                  </p>
                  <p className="text-foreground text-xl font-bold">{weather.humidity}%</p>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4 flex items-center gap-3">
                <Wind className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase">
                    {language === 'en-US' ? 'Wind' : 'Vento'}
                  </p>
                  <p className="text-foreground text-xl font-bold">{Math.round(weather.windSpeed)} km/h</p>
                </div>
              </div>
            </div>
            
            {/* Hourly forecast */}
            {weather.hourlyForecast && weather.hourlyForecast.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  {language === 'en-US' ? 'Hourly Forecast' : language === 'es-ES' ? 'Pronóstico por Hora' : 'Previsão por Hora'}
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {weather.hourlyForecast.map((hour, index) => (
                    <div key={index} className="flex flex-col items-center gap-1 bg-secondary/30 rounded-xl px-4 py-3 min-w-[70px]">
                      <span className="text-muted-foreground text-xs">{hour.time}</span>
                      {getWeatherIcon(hour.weatherCode, "w-6 h-6")}
                      <span className="text-foreground font-medium">{Math.round(hour.temperature)}°</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Tips */}
            {tips.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  {language === 'en-US' ? 'Tips for Today' : language === 'es-ES' ? 'Consejos para Hoy' : 'Dicas para Hoje'}
                </h3>
                <div className="space-y-3">
                  {tips.map((tip, index) => (
                    <div key={index} className="flex items-center gap-3 bg-secondary/30 rounded-xl px-4 py-3">
                      {tip.icon}
                      <span className="text-foreground text-sm">{tip.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Share button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="font-medium">
                  {language === 'en-US' ? 'Share' : language === 'es-ES' ? 'Compartir' : 'Compartilhar'}
                </span>
              </button>
            </div>
            
            {/* Settings hint */}
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 pb-6"
            >
              <Settings className="w-3 h-3" />
              {getSettingsHint()}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default WeatherForecastModal;
