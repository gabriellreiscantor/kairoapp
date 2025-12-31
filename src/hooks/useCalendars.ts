import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_default: boolean;
  is_visible: boolean;
  provider: 'horah' | 'google' | 'icloud' | 'outlook' | 'caldav';
  external_id: string | null;
  created_at: string;
  updated_at: string;
  event_count?: number;
}

interface UseCalendarsReturn {
  calendars: Calendar[];
  defaultCalendar: Calendar | null;
  horahCalendars: Calendar[];
  externalCalendars: Calendar[];
  usedHorahCalendars: number;
  maxHorahCalendars: number;
  canCreateHorahCalendar: boolean;
  loading: boolean;
  error: string | null;
  createCalendar: (name: string, color: string) => Promise<Calendar | null>;
  updateCalendar: (id: string, updates: Partial<Pick<Calendar, 'name' | 'color' | 'is_visible'>>) => Promise<boolean>;
  setDefaultCalendar: (id: string) => Promise<boolean>;
  deleteCalendar: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const CALENDAR_COLORS = [
  '#F97316', // Orange (default)
  '#EF4444', // Red
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
];

export const useCalendars = (): UseCalendarsReturn => {
  const { user } = useAuth();
  const { limits } = useSubscription();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxHorahCalendars = limits?.max_kairo_calendars ?? 3;

  const fetchCalendars = useCallback(async () => {
    if (!user) {
      setCalendars([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar calendários
      const { data: calendarsData, error: calendarsError } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (calendarsError) throw calendarsError;

      // Se não tem nenhum calendário, criar o padrão
      if (!calendarsData || calendarsData.length === 0) {
        const { data: newCalendar, error: createError } = await supabase
          .from('calendars')
          .insert({
            user_id: user.id,
            name: 'Meu Calendário',
            color: '#F97316',
            is_default: true,
            provider: 'horah',
          })
          .select()
          .single();

        if (createError) throw createError;
        
        setCalendars([newCalendar as Calendar]);
      } else {
        // Contar eventos por calendário
        const { data: eventCounts } = await supabase
          .from('events')
          .select('calendar_id')
          .eq('user_id', user.id)
          .not('calendar_id', 'is', null);

        const countMap: Record<string, number> = {};
        eventCounts?.forEach(e => {
          if (e.calendar_id) {
            countMap[e.calendar_id] = (countMap[e.calendar_id] || 0) + 1;
          }
        });

        const calendarsWithCount = calendarsData.map(cal => ({
          ...cal,
          event_count: countMap[cal.id] || 0,
        })) as Calendar[];

        setCalendars(calendarsWithCount);
      }
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setError('Erro ao carregar calendários');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const horahCalendars = calendars.filter(c => c.provider === 'horah');
  const externalCalendars = calendars.filter(c => c.provider !== 'horah');
  const usedHorahCalendars = horahCalendars.length;
  const canCreateHorahCalendar = usedHorahCalendars < maxHorahCalendars;
  const defaultCalendar = calendars.find(c => c.is_default) || null;

  const createCalendar = async (name: string, color: string): Promise<Calendar | null> => {
    if (!user) return null;

    if (!canCreateHorahCalendar) {
      toast.error(`Limite de ${maxHorahCalendars} calendários atingido. Faça upgrade do plano.`);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('calendars')
        .insert({
          user_id: user.id,
          name: name.trim(),
          color,
          is_default: false,
          provider: 'horah',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchCalendars();
      toast.success('Calendário criado!');
      return data as Calendar;
    } catch (err) {
      console.error('Error creating calendar:', err);
      toast.error('Erro ao criar calendário');
      return null;
    }
  };

  const updateCalendar = async (
    id: string,
    updates: Partial<Pick<Calendar, 'name' | 'color' | 'is_visible'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('calendars')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchCalendars();
      toast.success('Calendário atualizado!');
      return true;
    } catch (err) {
      console.error('Error updating calendar:', err);
      toast.error('Erro ao atualizar calendário');
      return false;
    }
  };

  const setDefaultCalendar = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('calendars')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      await fetchCalendars();
      toast.success('Calendário padrão alterado!');
      return true;
    } catch (err) {
      console.error('Error setting default calendar:', err);
      toast.error('Erro ao definir calendário padrão');
      return false;
    }
  };

  const deleteCalendar = async (id: string): Promise<boolean> => {
    if (horahCalendars.length <= 1) {
      toast.error('Você precisa ter pelo menos um calendário');
      return false;
    }

    const calendarToDelete = calendars.find(c => c.id === id);
    if (calendarToDelete?.is_default) {
      toast.error('Não é possível excluir o calendário padrão. Defina outro como padrão primeiro.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCalendars();
      toast.success('Calendário excluído!');
      return true;
    } catch (err) {
      console.error('Error deleting calendar:', err);
      toast.error('Erro ao excluir calendário');
      return false;
    }
  };

  return {
    calendars,
    defaultCalendar,
    horahCalendars,
    externalCalendars,
    usedHorahCalendars,
    maxHorahCalendars,
    canCreateHorahCalendar,
    loading,
    error,
    createCalendar,
    updateCalendar,
    setDefaultCalendar,
    deleteCalendar,
    refetch: fetchCalendars,
  };
};

export { CALENDAR_COLORS };
