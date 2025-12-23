import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PlanLimits {
  plan: 'free' | 'plus' | 'super';
  max_events_per_week: number;
  max_google_calendars: number;
  max_kairo_calendars: number;
  chat_capacity_multiplier: number;
  has_conflict_detection: boolean;
  has_daily_overview: boolean;
  has_critical_alerts: boolean;
  price_monthly: number;
  price_yearly: number;
}

interface SubscriptionData {
  plan: 'free' | 'plus' | 'super';
  billingPeriod: 'monthly' | 'yearly';
  startedAt: string | null;
  expiresAt: string | null;
}

interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  limits: PlanLimits | null;
  usedEvents: number;
  canCreateEvent: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [usedEvents, setUsedEvents] = useState(0);
  const [canCreateEvent, setCanCreateEvent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user subscription
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPlan = subData?.plan || 'free';

      setSubscription({
        plan: currentPlan as 'free' | 'plus' | 'super',
        billingPeriod: (subData?.billing_period || 'monthly') as 'monthly' | 'yearly',
        startedAt: subData?.started_at || null,
        expiresAt: subData?.expires_at || null,
      });

      // Get plan limits
      const { data: limitsData } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan', currentPlan)
        .single();

      if (limitsData) {
        setLimits(limitsData as PlanLimits);
      }

      // Count events this week using RPC
      const { data: countData } = await supabase.rpc('count_user_events_this_week', {
        _user_id: user.id
      });

      const eventCount = countData || 0;
      setUsedEvents(eventCount);

      // Check if can create event
      const { data: canCreate } = await supabase.rpc('can_create_event', {
        _user_id: user.id
      });

      setCanCreateEvent(canCreate ?? true);

    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar plano');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return {
    subscription,
    limits,
    usedEvents,
    canCreateEvent,
    loading,
    error,
    refetch: fetchData,
  };
}
