import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  fallbackPath?: string;
}

const BackButton = ({ fallbackPath = "/" }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
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
