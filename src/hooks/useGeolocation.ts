import { useState, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';

interface LocationResult {
  address: string;
  lat: number;
  lon: number;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export const useGeolocation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current position from device GPS
  const getCurrentPosition = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
    } catch (err) {
      console.error('Error getting position:', err);
      setError('Não foi possível obter sua localização');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reverse geocoding: coordinates -> address (using Nominatim)
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'pt-BR',
          },
        }
      );
      
      if (!response.ok) throw new Error('Falha na geocodificação');
      
      const data = await response.json();
      return data.display_name || null;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    }
  }, []);

  // Get current location and convert to address
  const getCurrentAddress = useCallback(async (): Promise<LocationResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const position = await getCurrentPosition();
      if (!position) return null;
      
      const address = await reverseGeocode(position.lat, position.lon);
      if (!address) {
        setError('Não foi possível obter o endereço');
        return null;
      }
      
      return {
        address,
        lat: position.lat,
        lon: position.lon,
      };
    } catch (err) {
      console.error('Error getting current address:', err);
      setError('Erro ao obter localização');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentPosition, reverseGeocode]);

  // Search addresses using Nominatim
  const searchAddresses = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 3) return [];
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=br`,
        {
          headers: {
            'Accept-Language': 'pt-BR',
          },
        }
      );
      
      if (!response.ok) throw new Error('Falha na busca');
      
      const data = await response.json();
      return data.map((item: any) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
      }));
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }, []);

  return {
    isLoading,
    error,
    getCurrentAddress,
    searchAddresses,
  };
};
