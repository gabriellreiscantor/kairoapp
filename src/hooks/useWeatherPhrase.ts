import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getWeatherPhrase, getPhrasesCacheKey, type WeatherPhrase } from '@/lib/weather-phrases';

interface UseWeatherPhraseOptions {
  weatherCode: number;
  temperature: number;
  language: string;
  city?: string;
  enabled?: boolean;
}

interface UseWeatherPhraseResult {
  phrase: WeatherPhrase;
  isLoading: boolean;
  isFromAI: boolean;
  refreshPhrase: () => void;
}

// Cache duration: 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

interface CachedPhrase {
  phrase: WeatherPhrase;
  timestamp: number;
}

function getCachedPhrase(key: string): WeatherPhrase | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed: CachedPhrase = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_DURATION_MS) {
      return parsed.phrase;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function setCachedPhrase(key: string, phrase: WeatherPhrase): void {
  try {
    const cached: CachedPhrase = {
      phrase,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // localStorage might be full or disabled
  }
}

export function useWeatherPhrase({
  weatherCode,
  temperature,
  language,
  city,
  enabled = true,
}: UseWeatherPhraseOptions): UseWeatherPhraseResult {
  // Start with a static phrase immediately
  const [phrase, setPhrase] = useState<WeatherPhrase>(() => 
    getWeatherPhrase(weatherCode, temperature, language)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFromAI, setIsFromAI] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAIPhrase = useCallback(async () => {
    if (!enabled) return;
    
    const cacheKey = getPhrasesCacheKey(weatherCode, temperature, language);
    
    // Check cache first
    const cached = getCachedPhrase(cacheKey);
    if (cached && refreshKey === 0) {
      setPhrase(cached);
      setIsFromAI(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 800);
      });
      
      // Create the fetch promise
      const fetchPromise = supabase.functions.invoke('generate-weather-phrase', {
        body: { weatherCode, temperature, language, city },
      });
      
      // Race between fetch and timeout
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (result && 'data' in result && result.data?.text) {
        const aiPhrase: WeatherPhrase = {
          text: result.data.text,
          emoji: result.data.emoji || '✨',
        };
        setPhrase(aiPhrase);
        setIsFromAI(true);
        setCachedPhrase(cacheKey, aiPhrase);
      } else {
        // Use static phrase if AI fails
        const staticPhrase = getWeatherPhrase(weatherCode, temperature, language);
        setPhrase(staticPhrase);
        setIsFromAI(false);
      }
    } catch (error) {
      console.log('Using static phrase (AI unavailable or timeout)');
      // Use static phrase on error/timeout
      const staticPhrase = getWeatherPhrase(weatherCode, temperature, language);
      setPhrase(staticPhrase);
      setIsFromAI(false);
    } finally {
      setIsLoading(false);
    }
  }, [weatherCode, temperature, language, city, enabled, refreshKey]);

  useEffect(() => {
    fetchAIPhrase();
  }, [fetchAIPhrase]);

  const refreshPhrase = useCallback(() => {
    // Force a new static phrase immediately while AI loads
    setPhrase(getWeatherPhrase(weatherCode, temperature, language));
    setIsFromAI(false);
    setRefreshKey(prev => prev + 1);
  }, [weatherCode, temperature, language]);

  return {
    phrase,
    isLoading,
    isFromAI,
    refreshPhrase,
  };
}
