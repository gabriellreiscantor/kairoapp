import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUserTimezone } from "@/lib/date-utils";
import { remoteLog } from "@/lib/remoteLogger";
import { Geolocation } from "@capacitor/geolocation";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  smart_suggestions_enabled: boolean;
  auto_reschedule_enabled: boolean;
  context_aware_enabled: boolean;
  learn_patterns_enabled: boolean;
  weather_forecast_enabled: boolean;
  weather_forecast_time: string | null;
  preferred_times: any[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    remoteLog.debug('auth', 'fetch_profile_start', { userId: userId.substring(0, 8) });
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (error) {
      remoteLog.error('auth', 'fetch_profile_error', { error: error.message });
    }
    
    if (!error && data) {
      setProfile(data as Profile);
      remoteLog.info('auth', 'profile_loaded', { 
        hasDisplayName: !!data.display_name,
        hasAvatar: !!data.avatar_url,
      });
      
      // Automatically update timezone on every login/session restore
      const currentTimezone = getUserTimezone();
      if (data.timezone !== currentTimezone) {
        supabase
          .from("profiles")
          .update({ timezone: currentTimezone })
          .eq("id", userId)
          .then(({ error: tzError }) => {
            if (tzError) {
              console.error('Error updating timezone:', tzError);
              remoteLog.error('auth', 'timezone_update_error', { error: tzError.message });
            } else {
              console.log(`Timezone updated: ${currentTimezone}`);
              remoteLog.info('auth', 'timezone_updated', { timezone: currentTimezone });
            }
          });
      }
      
      // Auto-update location if weather forecast is enabled (for travelers)
      if (data.weather_forecast_enabled) {
        updateLocationSilently(userId, data.user_city);
      }
    }
  };

  // Silently update user location if weather forecast is enabled
  const updateLocationSilently = async (userId: string, currentCity: string | null) => {
    try {
      // Check permission status first
      const permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        remoteLog.debug('geolocation', 'auto_update_skipped', { reason: 'no_permission' });
        return;
      }

      // Get current position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get city name
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );

      if (!response.ok) return;

      const geocodeData = await response.json();
      const newCity = geocodeData.address?.city || 
                      geocodeData.address?.town || 
                      geocodeData.address?.village || 
                      geocodeData.address?.municipality ||
                      geocodeData.name;

      // Only update if city changed
      if (newCity && newCity !== currentCity) {
        const { error } = await supabase
          .from('profiles')
          .update({
            user_latitude: latitude,
            user_longitude: longitude,
            user_city: newCity,
          })
          .eq('id', userId);

        if (!error) {
          remoteLog.info('geolocation', 'auto_update_success', { 
            oldCity: currentCity, 
            newCity 
          });
          console.log(`Location auto-updated: ${currentCity} → ${newCity}`);
        }
      }
    } catch (error) {
      // Silently fail - don't interrupt the user experience
      remoteLog.debug('geolocation', 'auto_update_failed', { 
        error: error instanceof Error ? error.message : 'unknown' 
      });
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        remoteLog.info('auth', 'auth_state_changed', { event, hasSession: !!session });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Update remoteLog user ID
        remoteLog.setUserId(session?.user?.id ?? null);
        
        // Defer profile fetch with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      remoteLog.info('auth', 'session_restored', { hasSession: !!session });
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Update remoteLog user ID
      remoteLog.setUserId(session?.user?.id ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    remoteLog.info('auth', 'login_attempt', { email: email.substring(0, 3) + '***' });
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      remoteLog.error('auth', 'login_error', { error: error.message });
    } else {
      remoteLog.info('auth', 'login_success');
    }
    
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    remoteLog.info('auth', 'signup_attempt', { email: email.substring(0, 3) + '***' });
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });
    
    if (error) {
      remoteLog.error('auth', 'signup_error', { error: error.message });
    } else {
      remoteLog.info('auth', 'signup_success');
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    remoteLog.info('auth', 'logout');
    
    await supabase.auth.signOut();
    localStorage.removeItem("kairo-logged-in");
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Clear user ID from remoteLog
    remoteLog.setUserId(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
