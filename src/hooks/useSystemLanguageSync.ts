import { useEffect, useCallback, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LanguageCode, getSystemLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { remoteLog } from '@/lib/remoteLogger';

const LAST_SYSTEM_LANG_KEY = 'horah_last_system_language';

interface UseSystemLanguageSyncResult {
  showDialog: boolean;
  detectedLanguage: LanguageCode | null;
  detectedLanguageName: string;
  currentLanguageName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const useSystemLanguageSync = (
  currentLanguage: LanguageCode,
  setLanguage: (lang: LanguageCode) => void
): UseSystemLanguageSyncResult => {
  const [showDialog, setShowDialog] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null);

  const getLanguageName = (code: LanguageCode | null): string => {
    if (!code) return '';
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang?.native || code;
  };

  const checkLanguageChange = useCallback(() => {
    const systemLang = getSystemLanguage();
    const lastDetectedLang = localStorage.getItem(LAST_SYSTEM_LANG_KEY);
    
    remoteLog.info('app_lifecycle', 'system_language_check', {
      systemLang,
      currentLanguage,
      lastDetectedLang,
    });

    // Update last detected system language
    localStorage.setItem(LAST_SYSTEM_LANG_KEY, systemLang);

    // Only show dialog if:
    // 1. System language is different from app language
    // 2. System language changed since last check (not just different from app)
    if (systemLang !== currentLanguage && systemLang !== lastDetectedLang) {
      remoteLog.info('app_lifecycle', 'system_language_changed', {
        from: lastDetectedLang,
        to: systemLang,
        appLanguage: currentLanguage,
      });
      setDetectedLanguage(systemLang);
      setShowDialog(true);
    }
  }, [currentLanguage]);

  const onAccept = useCallback(() => {
    if (detectedLanguage) {
      remoteLog.info('app_lifecycle', 'system_language_accepted', { newLanguage: detectedLanguage });
      setLanguage(detectedLanguage);
    }
    setShowDialog(false);
    setDetectedLanguage(null);
  }, [detectedLanguage, setLanguage]);

  const onDecline = useCallback(() => {
    remoteLog.info('app_lifecycle', 'system_language_declined', { 
      keptLanguage: currentLanguage,
      declinedLanguage: detectedLanguage 
    });
    setShowDialog(false);
    setDetectedLanguage(null);
  }, [currentLanguage, detectedLanguage]);

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Check on initial mount
    checkLanguageChange();

    // Listen for app state changes (foreground/background)
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        remoteLog.info('app_lifecycle', 'app_resumed_checking_language');
        checkLanguageChange();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [checkLanguageChange]);

  return {
    showDialog,
    detectedLanguage,
    detectedLanguageName: getLanguageName(detectedLanguage),
    currentLanguageName: getLanguageName(currentLanguage),
    onAccept,
    onDecline,
  };
};
