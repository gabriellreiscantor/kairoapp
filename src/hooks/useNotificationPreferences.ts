import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationPreferences {
  push_enabled: boolean;
  call_enabled: boolean;
  whatsapp_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  critical_alerts_enabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
  push_enabled: true,
  call_enabled: true,
  whatsapp_enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  critical_alerts_enabled: true,
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("push_enabled, call_enabled, whatsapp_enabled, sound_enabled, vibration_enabled, critical_alerts_enabled")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading notification preferences:", error);
        return;
      }

      if (data) {
        setPreferences({
          push_enabled: data.push_enabled ?? true,
          call_enabled: data.call_enabled ?? true,
          whatsapp_enabled: data.whatsapp_enabled ?? true,
          sound_enabled: data.sound_enabled ?? true,
          vibration_enabled: data.vibration_enabled ?? true,
          critical_alerts_enabled: data.critical_alerts_enabled ?? true,
        });
      }
    } catch (err) {
      console.error("Error loading notification preferences:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Save a single preference
  const updatePreference = useCallback(
    async <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K]
    ): Promise<boolean> => {
      if (!user?.id) return false;

      setIsSaving(true);
      
      // Optimistic update
      setPreferences((prev) => ({ ...prev, [key]: value }));

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ [key]: value })
          .eq("id", user.id);

        if (error) {
          console.error(`Error updating ${key}:`, error);
          // Revert on error
          setPreferences((prev) => ({ ...prev, [key]: !value }));
          return false;
        }

        return true;
      } catch (err) {
        console.error(`Error updating ${key}:`, err);
        // Revert on error
        setPreferences((prev) => ({ ...prev, [key]: !value }));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id]
  );

  // Load on mount and when user changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreference,
    reloadPreferences: loadPreferences,
  };
};
