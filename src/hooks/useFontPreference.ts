import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

export type FontOption = 'system' | 'inter' | 'roboto' | 'poppins' | 'nunito' | 'lato';

export interface FontConfig {
  id: FontOption;
  name: string;
  family: string;
  googleFont?: string;
  description: string;
}

export const FONT_OPTIONS: FontConfig[] = [
  { 
    id: 'system', 
    name: 'Sistema', 
    family: '-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    description: 'Fonte nativa do dispositivo (iOS: San Francisco, Android: Roboto)'
  },
  { 
    id: 'inter', 
    name: 'Inter', 
    family: '"Inter", system-ui, sans-serif',
    googleFont: 'Inter:wght@300;400;500;600;700;800',
    description: 'Moderna e legível, ideal para interfaces'
  },
  { 
    id: 'roboto', 
    name: 'Roboto', 
    family: '"Roboto", system-ui, sans-serif',
    googleFont: 'Roboto:wght@300;400;500;700',
    description: 'Clássica do Android, limpa e versátil'
  },
  { 
    id: 'poppins', 
    name: 'Poppins', 
    family: '"Poppins", system-ui, sans-serif',
    googleFont: 'Poppins:wght@300;400;500;600;700',
    description: 'Geométrica e amigável'
  },
  { 
    id: 'nunito', 
    name: 'Nunito', 
    family: '"Nunito", system-ui, sans-serif',
    googleFont: 'Nunito:wght@300;400;500;600;700',
    description: 'Arredondada e acolhedora'
  },
  { 
    id: 'lato', 
    name: 'Lato', 
    family: '"Lato", system-ui, sans-serif',
    googleFont: 'Lato:wght@300;400;700',
    description: 'Elegante e profissional'
  },
];

export function useFontPreference() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [currentFont, setCurrentFont] = useState<FontOption>('system');
  const [loading, setLoading] = useState(true);

  const isPremium = subscription?.plan === 'plus' || subscription?.plan === 'super';

  // Load font preference from database
  useEffect(() => {
    const loadFontPreference = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('font_preference')
          .eq('id', user.id)
          .single();

        if (data?.font_preference) {
          // If not premium, force system font
          const font = isPremium ? (data.font_preference as FontOption) : 'system';
          setCurrentFont(font);
          applyFont(font);
        } else {
          applyFont('system');
        }
      } catch (error) {
        console.error('Error loading font preference:', error);
        applyFont('system');
      } finally {
        setLoading(false);
      }
    };

    loadFontPreference();
  }, [user, isPremium]);

  // Apply font to document
  const applyFont = useCallback((fontId: FontOption) => {
    const fontConfig = FONT_OPTIONS.find(f => f.id === fontId);
    if (!fontConfig) return;

    // Load Google Font if needed
    if (fontConfig.googleFont) {
      loadGoogleFont(fontConfig.googleFont);
    }

    // Apply to body
    document.body.style.fontFamily = fontConfig.family;
  }, []);

  // Load Google Font dynamically
  const loadGoogleFont = (fontName: string) => {
    const existingLink = document.querySelector(`link[href*="${fontName.split(':')[0]}"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName}&display=swap`;
    document.head.appendChild(link);
  };

  // Save font preference
  const setFont = useCallback(async (fontId: FontOption) => {
    if (!user) return;

    // Non-premium users can only use system font
    if (!isPremium && fontId !== 'system') {
      return;
    }

    setCurrentFont(fontId);
    applyFont(fontId);

    try {
      await supabase
        .from('profiles')
        .update({ font_preference: fontId })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error saving font preference:', error);
    }
  }, [user, isPremium, applyFont]);

  return {
    currentFont,
    setFont,
    loading,
    isPremium,
    fontOptions: FONT_OPTIONS,
  };
}
