import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTimezone } from "@/lib/date-utils";

/**
 * Hook that automatically saves the user's timezone to their profile.
 * This ensures the backend always has the correct timezone for notifications.
 */
export const useTimezone = () => {
  const { user } = useAuth();

  useEffect(() => {
    const saveTimezone = async () => {
      if (!user) return;

      const currentTimezone = getUserTimezone();
      
      try {
        // Update the user's timezone in their profile
        const { error } = await supabase
          .from('profiles')
          .update({ timezone: currentTimezone })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving timezone:', error);
        } else {
          console.log(`Timezone saved: ${currentTimezone}`);
        }
      } catch (error) {
        console.error('Error saving timezone:', error);
      }
    };

    saveTimezone();
  }, [user]);

  return getUserTimezone();
};
