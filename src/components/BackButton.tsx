import { ChevronLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface BackButtonProps {
  fallbackPath?: string;
}

const BackButton = ({ fallbackPath = "/" }: BackButtonProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleBack = () => {
    // Check if user came from settings drawer
    const fromSettings = searchParams.get('from') === 'settings';
    
    if (fromSettings) {
      // Navigate to home with settings drawer open
      navigate('/?settings=open');
    } else {
      // Navigate to fallback path
      navigate(fallbackPath);
    }
  };

  return (
    <button 
      onClick={handleBack}
      className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center active:scale-95 transition-transform"
    >
      <ChevronLeft className="w-5 h-5 text-foreground" />
    </button>
  );
};

export default BackButton;
