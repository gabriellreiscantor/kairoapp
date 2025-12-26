import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';

// Update location every 30 minutes max
const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

interface LocationProfile {
  user_city: string | null;
  user_latitude: number | null;
  user_longitude: number | null;
  weather_forecast_enabled: boolean | null;
}

export function useAutoLocationUpdate() {
  const { user, profile } = useAuth();
  const { getCurrentAddress, permissionStatus } = useGeolocation();
  const lastUpdateRef = useRef<number>(0);
  const isUpdatingRef = useRef(false);
  const [locationProfile, setLocationProfile] = useState<LocationProfile | null>(null);

  // Fetch location data from profile (since Profile interface doesn't include all fields)
  useEffect(() => {
    async function fetchLocationProfile() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_city, user_latitude, user_longitude, weather_forecast_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setLocationProfile(data);
      }
    }

    fetchLocationProfile();
  }, [user?.id, profile?.weather_forecast_enabled]);

  useEffect(() => {
    async function updateLocationIfNeeded() {
      // Only update if weather forecast is enabled
      if (!locationProfile?.weather_forecast_enabled) {
        console.log('[AutoLocation] Weather forecast not enabled, skipping');
        return;
      }

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

      isUpdatingRef.current = true;
      console.log('[AutoLocation] Starting location update...');

      try {
        const address = await getCurrentAddress();
        
        if (!address) {
          console.log('[AutoLocation] Could not get address');
          return;
        }

        // Extract city name (first part before comma)
        const cityName = address.address.split(',')[0]?.trim();
        
        if (!cityName) {
          console.log('[AutoLocation] Could not extract city name');
          return;
        }

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
          // Update local state
          setLocationProfile(prev => prev ? {
            ...prev,
            user_city: cityName,
            user_latitude: address.lat,
            user_longitude: address.lon,
          } : null);
        }
      } catch (error) {
        console.error('[AutoLocation] Error:', error);
      } finally {
        isUpdatingRef.current = false;
      }
    }

    // Small delay to not block app startup
    const timer = setTimeout(updateLocationIfNeeded, 2000);

    return () => clearTimeout(timer);
  }, [user?.id, locationProfile, getCurrentAddress, permissionStatus]);
}
