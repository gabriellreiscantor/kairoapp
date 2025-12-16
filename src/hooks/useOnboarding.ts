import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type OnboardingStep = 
  | 'welcome'           // Initial message, waiting for first interaction
  | 'guiding'           // Guiding user to create first event
  | 'first_event_created' // First event just created
  | 'suggest_weekly'    // Suggesting weekly planning
  | 'suggest_calendar'  // Suggesting calendar connection
  | 'completed';        // Onboarding done

interface OnboardingState {
  step: OnboardingStep;
  firstEventCreated: boolean;
  isLoading: boolean;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    step: 'welcome',
    firstEventCreated: false,
    isLoading: true,
  });

  // Load onboarding state from database
  useEffect(() => {
    const loadState = async () => {
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, onboarding_step, first_event_created')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setState({
            step: (data.onboarding_completed ? 'completed' : (data.onboarding_step as OnboardingStep)) || 'welcome',
            firstEventCreated: data.first_event_created || false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error loading onboarding state:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadState();
  }, [user]);

  // Update step in database
  const setStep = useCallback(async (newStep: OnboardingStep) => {
    if (!user) return;

    setState(prev => ({ ...prev, step: newStep }));

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_step: newStep,
          onboarding_completed: newStep === 'completed',
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  }, [user]);

  // Mark first event as created
  const markFirstEventCreated = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, firstEventCreated: true, step: 'first_event_created' }));

    try {
      await supabase
        .from('profiles')
        .update({ 
          first_event_created: true,
          onboarding_step: 'first_event_created',
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error marking first event created:', error);
    }
  }, [user]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    await setStep('completed');
  }, [setStep]);

  // Check if user is in onboarding
  const isInOnboarding = state.step !== 'completed';

  return {
    ...state,
    isInOnboarding,
    setStep,
    markFirstEventCreated,
    completeOnboarding,
  };
};
