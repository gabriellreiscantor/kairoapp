import { useLanguage } from "@/contexts/LanguageContext";
import { useSystemLanguageSync } from "@/hooks/useSystemLanguageSync";
import { LanguageChangeDialog } from "@/components/LanguageChangeDialog";

/**
 * Component that handles automatic system language change detection.
 * Must be rendered inside LanguageProvider.
 */
export const SystemLanguageSyncHandler = () => {
  const { language, setLanguage } = useLanguage();
  
  const {
    showDialog,
    detectedLanguageName,
    currentLanguageName,
    onAccept,
    onDecline,
  } = useSystemLanguageSync(language, setLanguage);

  return (
    <LanguageChangeDialog
      open={showDialog}
      detectedLanguageName={detectedLanguageName}
      currentLanguageName={currentLanguageName}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
};
