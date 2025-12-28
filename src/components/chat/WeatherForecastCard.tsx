import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ptBR, enUS, es, fr, ja, ko, zhCN } from "date-fns/locale";
import { ChevronRight, Droplets, Wind, MapPin, Thermometer, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWeatherPhrase } from "@/hooks/useWeatherPhrase";
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

interface WeatherForecastCardProps {
  weather: WeatherData;
  onClick: () => void;
}

// Weather code to gradient mapping
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

// Weather code to emoji mapping
const getWeatherEmoji = (code: number): string => {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '☀️';
};

// Weather code to icon mapping (WMO codes)
const getWeatherIcon = (code: number, size: string = "w-8 h-8") => {
  if (code === 0) return <Sun className={`${size} text-yellow-400`} />;
  if (code >= 1 && code <= 3) return <Cloud className={`${size} text-gray-300`} />;
  if (code >= 45 && code <= 48) return <CloudFog className={`${size} text-gray-400`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${size} text-blue-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-500`} />;
  if (code >= 95 && code <= 99) return <CloudLightning className={`${size} text-yellow-500`} />;
  return <Sun className={`${size} text-yellow-400`} />;
};

// Weather code to description
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

const WeatherForecastCard: React.FC<WeatherForecastCardProps> = ({ weather, onClick }) => {
  const { language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  // Get personalized weather phrase with refresh capability
  const { phrase, refreshPhrase } = useWeatherPhrase({
    weatherCode: weather.weatherCode,
    temperature: weather.temperature,
    language,
    city: weather.city,
    enabled: true,
  });

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger refresh
          setIsRefreshing(true);
          refreshPhrase();
          setTimeout(() => setIsRefreshing(false), 800);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [refreshPhrase]);
  
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
      return format(date, "EEEE, d 'de' MMMM", { locale });
    } catch {
      return weather.date;
    }
  };

  return (
    <div 
      onClick={onClick}
      className="w-full max-w-[320px] cursor-pointer group animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
    >
      {/* Card with gradient background */}
      <div className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]">
        {/* Gradient background - dynamic based on weather */}
        <div 
          className="absolute inset-0 opacity-90"
          style={{
            background: getWeatherGradient(weather.weatherCode),
          }}
        />
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/10" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header with greeting and location */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {getWeatherEmoji(weather.weatherCode)} {language === 'en-US' ? 'Weather' : 'Clima'}
              </span>
              {/* Refresh indicator */}
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-2 py-1">
                <RefreshCw className={`w-3 h-3 text-white/70 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-white/60 text-[10px] font-medium tabular-nums">{countdown}s</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{weather.city}</span>
            </div>
          </div>
          
          {/* Personalized phrase */}
          <p className="text-white/90 text-sm font-medium mb-1">
            {phrase.emoji} {phrase.text}
          </p>
          
          {/* Date */}
          <p className="text-white/70 text-xs mb-4 capitalize">{formatDate()}</p>
          
          {/* Main temperature display */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {getWeatherIcon(weather.weatherCode, "w-16 h-16")}
              <div>
                <p className="text-white text-5xl font-bold">
                  {Math.round(weather.temperature)}°
                </p>
                <p className="text-white/80 text-sm">
                  {getWeatherDescription(weather.weatherCode, language)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Min/Max temperatures */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Thermometer className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-white/90 text-xs">
                {language === 'en-US' ? 'Min' : 'Mín'}: {Math.round(weather.temperatureMin)}°
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Thermometer className="w-3.5 h-3.5 text-red-300" />
              <span className="text-white/90 text-xs">
                {language === 'en-US' ? 'Max' : 'Máx'}: {Math.round(weather.temperatureMax)}°
              </span>
            </div>
          </div>
          
          {/* Additional info */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-300" />
              <span className="text-white/80 text-sm">{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-white/70" />
              <span className="text-white/80 text-sm">{Math.round(weather.windSpeed)} km/h</span>
            </div>
          </div>
          
          {/* Read more button */}
          <div className="flex justify-end">
            <button className="flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full transition-colors">
              {language === 'en-US' ? 'See details' : language === 'es-ES' ? 'Ver detalles' : 'Ver detalhes'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherForecastCard;
