import FoxIcon from "./icons/FoxIcon";

interface LoginScreenProps {
  onLogin: () => void;
}

const FloatingChip = ({ emoji, time, className }: { emoji: string; time: string; className?: string }) => (
  <div 
    className={`floating-chip absolute bg-kairo-surface-2/80 border border-border/20 rounded-full px-3 py-1.5 flex items-center gap-1.5 ${className}`}
  >
    <span className="text-sm">{emoji}</span>
    <span className="text-foreground font-medium text-xs">{time}</span>
  </div>
);

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Floating Chips */}
      <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none">
        <FloatingChip emoji="🍔" time="13:00" className="top-12 left-6" />
        <FloatingChip emoji="✈️" time="17:00" className="top-20 right-4" />
        <FloatingChip emoji="💊" time="21:00" className="top-32 left-1/4" />
        <FloatingChip emoji="🏋️" time="07:00" className="top-24 right-1/4" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20">
        {/* Logo with Gradient Background */}
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center">
            <FoxIcon size={44} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-foreground mb-1">Kairo</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Crie eventos em segundos
        </p>

        {/* Login Buttons */}
        <div className="w-full max-w-xs space-y-2.5">
          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2.5 bg-kairo-surface-2 border border-border/30 rounded-xl px-4 py-3 transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-foreground text-sm font-medium">Continuar com Google</span>
          </button>

          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2.5 bg-kairo-surface-2 border border-border/30 rounded-xl px-4 py-3 transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span className="text-foreground text-sm font-medium">Continuar com Apple</span>
          </button>
        </div>

        {/* Secondary Login Options */}
        <div className="flex items-center gap-3 mt-5">
          <button 
            onClick={onLogin}
            className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center transition-transform active:scale-95"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
          
          <button 
            onClick={onLogin}
            className="w-11 h-11 rounded-full bg-kairo-surface-2 border border-border/30 flex items-center justify-center transition-transform active:scale-95"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 text-center safe-area-bottom">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Ao continuar, você concorda com os{' '}
          <span className="text-foreground/70">Termos</span>
          {' '}e{' '}
          <span className="text-foreground/70">Privacidade</span>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
