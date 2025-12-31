import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { remoteLog } from '@/lib/remoteLogger';

// Helper to get Geolocation dynamically
const getGeolocation = async () => {
  const { Geolocation } = await import('@capacitor/geolocation');
  return Geolocation;
};

// Brazilian state abbreviations
const STATE_ABBREVIATIONS: Record<string, string> = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO',
};

interface LocationResult {
  address: string;
  lat: number;
  lon: number;
}

interface CityInfo {
  city: string;
  state: string;
  stateAbbr: string;
  formatted: string; // "Cuiabá, MT"
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

type PermissionStatus = 'granted' | 'denied' | 'prompt';

export const useGeolocation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);

  // Request location permission explicitly
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Skip on web/preview - only run on native platforms
      if (!Capacitor.isNativePlatform()) {
        remoteLog.debug('geolocation', 'permission_skipped_web');
        return false;
      }

      remoteLog.info('geolocation', 'permission_check_started');
      
      // Dynamic import to avoid loading plugin in web preview
      const Geolocation = await getGeolocation();
      
      // First check current permission status
      const status = await Geolocation.checkPermissions();
      remoteLog.info('geolocation', 'permission_current_status', { status: status.location });
      
      if (status.location === 'denied') {
        setPermissionStatus('denied');
        setError('Permissão de localização negada. Vá em Ajustes > Horah para permitir.');
        remoteLog.warn('geolocation', 'permission_denied');
        return false;
      }
      
      if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
        remoteLog.info('geolocation', 'permission_requesting');
        // Request permission - this triggers the native iOS/Android popup
        const result = await Geolocation.requestPermissions();
        setPermissionStatus(result.location as PermissionStatus);
        remoteLog.info('geolocation', 'permission_result', { result: result.location });
        
        if (result.location !== 'granted') {
          setError('Permissão de localização não concedida');
          remoteLog.warn('geolocation', 'permission_not_granted', { result: result.location });
          return false;
        }
      }
      
      setPermissionStatus('granted');
      remoteLog.info('geolocation', 'permission_granted');
      return true;
    } catch (err) {
      console.error('Error requesting location permission:', err);
      remoteLog.error('geolocation', 'permission_error', { error: String(err) });
      setError('Erro ao verificar permissões de localização');
      return false;
    }
  }, []);

  // Get current position from device GPS (requires permission first)
  const getCurrentPosition = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Request permission before getting position
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return null;
      }
      
      remoteLog.info('geolocation', 'position_fetching');
      
      // Dynamic import to avoid loading plugin in web preview
      const Geolocation = await getGeolocation();
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      
      remoteLog.info('geolocation', 'position_received', { 
        lat: position.coords.latitude.toFixed(4),
        lon: position.coords.longitude.toFixed(4),
        accuracy: position.coords.accuracy,
      });
      
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
    } catch (err) {
      console.error('Error getting position:', err);
      remoteLog.error('geolocation', 'position_error', { error: String(err) });
      setError('Não foi possível obter sua localização');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [requestLocationPermission]);

  // Format address from Nominatim components: Rua, Bairro, Cidade, Estado, CEP
  const formatAddress = (address: any): string => {
    const parts = [
      address.road,                                    // Rua
      address.suburb || address.neighbourhood,         // Bairro
      address.city || address.town || address.village, // Cidade
      address.state,                                   // Estado
      address.postcode                                 // CEP
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  // Reverse geocoding: coordinates -> address (using Nominatim)
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<string | null> => {
    try {
      remoteLog.debug('geolocation', 'reverse_geocode_start', { lat: lat.toFixed(4), lon: lon.toFixed(4) });
      
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
      
      // Use formatted address if we have address details, otherwise fallback to display_name
      if (data.address) {
        const formattedAddress = formatAddress(data.address);
        remoteLog.info('geolocation', 'reverse_geocode_success', { addressPreview: formattedAddress.substring(0, 30) });
        return formattedAddress;
      }
      return data.display_name || null;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      remoteLog.error('geolocation', 'reverse_geocode_error', { error: String(err) });
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
      
      remoteLog.info('geolocation', 'address_obtained', { 
        addressPreview: address.substring(0, 30),
        lat: position.lat.toFixed(4),
        lon: position.lon.toFixed(4),
      });
      
      return {
        address,
        lat: position.lat,
        lon: position.lon,
      };
    } catch (err) {
      console.error('Error getting current address:', err);
      remoteLog.error('geolocation', 'address_error', { error: String(err) });
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
      remoteLog.debug('geolocation', 'address_search_start', { queryLength: query.length });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=br&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'pt-BR',
          },
        }
      );
      
      if (!response.ok) throw new Error('Falha na busca');
      
      const data = await response.json();
      const results = data.map((item: any) => ({
        display_name: item.address ? formatAddress(item.address) : item.display_name,
        lat: item.lat,
        lon: item.lon,
      }));
      
      remoteLog.info('geolocation', 'address_search_complete', { resultsCount: results.length });
      
      return results;
    } catch (err) {
      console.error('Search error:', err);
      remoteLog.error('geolocation', 'address_search_error', { error: String(err) });
      return [];
    }
  }, []);

  // Extract city info from coordinates (returns "Cidade, UF" format)
  const getCityInfo = useCallback(async (lat: number, lon: number): Promise<CityInfo | null> => {
    try {
      remoteLog.debug('geolocation', 'get_city_info_start', { lat: lat.toFixed(4), lon: lon.toFixed(4) });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=10`,
        {
          headers: {
            'Accept-Language': 'pt-BR',
          },
        }
      );
      
      if (!response.ok) throw new Error('Falha na geocodificação');
      
      const data = await response.json();
      
      if (!data.address) return null;
      
      const city = data.address.city || 
                   data.address.town || 
                   data.address.village || 
                   data.address.municipality ||
                   data.address.county;
      
      const state = data.address.state || '';
      const stateAbbr = STATE_ABBREVIATIONS[state] || state.substring(0, 2).toUpperCase();
      
      if (!city) return null;
      
      const formatted = stateAbbr ? `${city}, ${stateAbbr}` : city;
      
      remoteLog.info('geolocation', 'city_info_extracted', { city, state, formatted });
      
      return {
        city,
        state,
        stateAbbr,
        formatted,
      };
    } catch (err) {
      console.error('Get city info error:', err);
      remoteLog.error('geolocation', 'get_city_info_error', { error: String(err) });
      return null;
    }
  }, []);

  return {
    isLoading,
    error,
    permissionStatus,
    requestLocationPermission,
    getCurrentAddress,
    searchAddresses,
    getCityInfo,
  };
};
