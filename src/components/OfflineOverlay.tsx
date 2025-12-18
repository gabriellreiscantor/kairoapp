import { WifiOff, Loader2 } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import kairoLogo from '@/assets/kairo-logo.png';

const OfflineOverlay = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-kairo-orange/5 via-transparent to-kairo-orange/5" />
      
      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        {/* Kairo Logo */}
        <div className="mb-8 animate-pulse-soft">
          <img 
            src={kairoLogo} 
            alt="Kairo" 
            className="h-20 w-20 object-contain"
          />
        </div>

        {/* Wifi Off Icon */}
        <div className="mb-6 rounded-full bg-muted/50 p-4">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-semibold text-foreground">
          Você está sem internet
        </h1>

        {/* Subtitle */}
        <p className="mb-8 max-w-xs text-muted-foreground">
          Quando a conexão voltar, vamos atualizar automaticamente
        </p>

        {/* Loading spinner */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Aguardando conexão...</span>
        </div>
      </div>
    </div>
  );
};

export default OfflineOverlay;
