import React from "react";
import { format, parseISO } from "date-fns";
import { ptBR, enUS, es, fr, ja, ko, zhCN } from "date-fns/locale";
import { ChevronRight, Droplets, Wind, MapPin, Thermometer, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === 'en-US') {
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    }
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div 
      onClick={onClick}
      className="w-full max-w-[320px] cursor-pointer group animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
    >
      {/* Card with gradient background */}
      <div className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]">
        {/* Gradient background - purple/blue for weather */}
        <div 
          className="absolute inset-0 opacity-90"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
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
                ☀️ {language === 'en-US' ? 'Weather' : 'Clima'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px]">{weather.city}</span>
            </div>
          </div>
          
          {/* Greeting */}
          <p className="text-white/80 text-sm mb-1">{getGreeting()}!</p>
          
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
