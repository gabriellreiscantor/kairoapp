import type { CapacitorConfig } from '@capacitor/cli';

// Detecta se está em desenvolvimento
const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.kairo',
  appName: 'Kairo',
  webDir: 'dist',
  
  // Cor de fundo do WebView - combina com o splash do polvo
  backgroundColor: '#0a1628',
  
  // Configurações específicas do iOS
  ios: {
    backgroundColor: '#0a1628',
    scrollEnabled: true,
  },
  
  // Configuração do Splash Screen nativo - esconder imediatamente para evitar tela branca
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Esconder imediatamente
      launchAutoHide: true, // Auto-esconder
      backgroundColor: '#0a1628',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    }
  },
  
  // Server URL só em desenvolvimento (hot-reload)
  // Em produção, carrega arquivos locais da pasta dist
  ...(isDev && {
    server: {
      url: 'https://c22861fc-467c-41aa-89f7-0d5fb35a5ac2.lovableproject.com?forceHideBadge=true',
      cleartext: true
    }
  })
};

export default config;
