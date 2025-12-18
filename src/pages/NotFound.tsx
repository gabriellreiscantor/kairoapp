import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { X } from 'lucide-react';
import kairoLogo from '@/assets/kairo-logo.png';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-kairo-orange/5 via-transparent to-kairo-orange/5" />
      
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 z-20 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground safe-area-top"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="relative z-10 flex flex-col items-center px-8 text-center animate-fade-in">
        {/* Kairo Logo */}
        <div className="mb-8">
          <img 
            src={kairoLogo} 
            alt="Kairo" 
            className="h-24 w-24 object-contain"
          />
        </div>

        {/* 404 Number */}
        <h1 className="mb-4 text-7xl font-bold text-foreground/20">
          404
        </h1>

        {/* Title */}
        <h2 className="mb-3 text-xl font-semibold text-foreground">
          Opa, essa página não existe
        </h2>

        {/* Subtitle */}
        <p className="max-w-xs text-muted-foreground">
          Mas calma, vamos te levar de volta ao início
        </p>
      </div>
    </div>
  );
};

export default NotFound;
