import { useEffect } from 'react';
import { useFontPreference } from '@/hooks/useFontPreference';

/**
 * This component initializes the font preference on app load.
 * It should be placed inside AuthProvider to have access to user context.
 */
export const FontInitializer = () => {
  const { currentFont, loading } = useFontPreference();
  
  // The hook already applies the font on load, this component just triggers it
  useEffect(() => {
    if (!loading) {
      console.log('[FontInitializer] Font preference loaded:', currentFont);
    }
  }, [currentFont, loading]);
  
  return null;
};

export default FontInitializer;
