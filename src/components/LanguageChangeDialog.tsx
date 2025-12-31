import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LanguageChangeDialogProps {
  open: boolean;
  detectedLanguageName: string;
  currentLanguageName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const LanguageChangeDialog = ({
  open,
  detectedLanguageName,
  currentLanguageName,
  onAccept,
  onDecline,
}: LanguageChangeDialogProps) => {
  const { t } = useLanguage();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-[90vw] rounded-2xl">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="w-8 h-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            {t('languageChange.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t('languageChange.description').replace('{language}', detectedLanguageName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={onDecline}
            className="w-full sm:w-auto"
          >
            {t('languageChange.keep').replace('{language}', currentLanguageName)}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onAccept}
            className="w-full sm:w-auto"
          >
            {t('languageChange.change').replace('{language}', detectedLanguageName)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
