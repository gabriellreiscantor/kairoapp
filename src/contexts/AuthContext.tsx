import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUserTimezone } from "@/lib/date-utils";
import { remoteLog } from "@/lib/remoteLogger";

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
