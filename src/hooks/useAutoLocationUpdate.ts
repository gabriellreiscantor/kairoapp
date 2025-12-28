import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';

// Update location every 30 minutes max
const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

export function useAutoLocationUpdate() {
  const { user, profile } = useAuth();
  const { getCurrentAddress, permissionStatus } = useGeolocation();
  const lastUpdateRef = useRef<number>(0);
  const isUpdatingRef = useRef(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Only run once per mount
    if (hasRunRef.current) return;
    
    async function updateLocationIfNeeded() {
      if (!user?.id) {
        console.log('[AutoLocation] No user, skipping');
        return;
      }

      // Check if already updating
      if (isUpdatingRef.current) {
        console.log('[AutoLocation] Already updating, skipping');
        return;
      }

      // Check if we updated recently (in this session)
      const now = Date.now();
      if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) {
        console.log('[AutoLocation] Updated recently, skipping');
        return;
      }

      // Check permission status
      if (permissionStatus === 'denied') {
        console.log('[AutoLocation] Permission denied, skipping');
        return;
      }

      // Fetch current profile data
      const { data: locationProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_city, user_latitude, user_longitude, weather_forecast_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError || !locationProfile) {
        console.log('[AutoLocation] Could not fetch profile');
        return;
      }

      // Only update if weather forecast is enabled
      if (!locationProfile.weather_forecast_enabled) {
        console.log('[AutoLocation] Weather forecast not enabled, skipping');
        return;
      }

      isUpdatingRef.current = true;
      hasRunRef.current = true;
      console.log('[AutoLocation] Starting location update...');

      try {
        const address = await getCurrentAddress();
        
        if (!address) {
          console.log('[AutoLocation] Could not get address');
          return;
        }

        // Get city info with proper format ("Cidade, UF")
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${address.lat}&lon=${address.lon}&format=json&addressdetails=1&zoom=10`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        
        if (!response.ok) {
          console.log('[AutoLocation] Reverse geocode failed');
          return;
        }
        
        const data = await response.json();
        if (!data.address) {
          console.log('[AutoLocation] No address data');
          return;
        }
        
        // Brazilian state abbreviations
        const STATE_ABBR: Record<string, string> = {
          'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
          'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
          'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
          'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
          'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
          'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
          'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
        };
        
        const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
        const state = data.address.state || '';
        const stateAbbr = STATE_ABBR[state] || state.substring(0, 2).toUpperCase();
        
        if (!city) {
          console.log('[AutoLocation] Could not extract city name');
          return;
        }
        
        const cityName = stateAbbr ? `${city}, ${stateAbbr}` : city;

        // Check if city changed
        const cityChanged = cityName !== locationProfile.user_city;
        const coordsChanged = 
          Math.abs(address.lat - (locationProfile.user_latitude || 0)) > 0.01 ||
          Math.abs(address.lon - (locationProfile.user_longitude || 0)) > 0.01;

        if (!cityChanged && !coordsChanged) {
          console.log('[AutoLocation] Location unchanged, skipping update');
          lastUpdateRef.current = now;
          return;
        }

        console.log('[AutoLocation] Updating location:', {
          oldCity: locationProfile.user_city,
          newCity: cityName,
          lat: address.lat,
          lon: address.lon,
        });

        const { error } = await supabase
          .from('profiles')
          .update({
            user_city: cityName,
            user_latitude: address.lat,
            user_longitude: address.lon,
          })
          .eq('id', user.id);

        if (error) {
          console.error('[AutoLocation] Error updating location:', error);
        } else {
          console.log('[AutoLocation] Location updated successfully to:', cityName);
          lastUpdateRef.current = now;
        }
      } catch (error) {
        console.error('[AutoLocation] Error:', error);
      } finally {
        isUpdatingRef.current = false;
      }
    }

    // Small delay to not block app startup
    const timer = setTimeout(updateLocationIfNeeded, 3000);

    return () => clearTimeout(timer);
  }, [user?.id, getCurrentAddress, permissionStatus]);
}
