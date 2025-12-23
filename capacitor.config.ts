import type { CapacitorConfig } from '@capacitor/cli';

// Detecta se está em desenvolvimento
const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.kairo',
  appName: 'Kairo',
  webDir: 'dist',
  
  // Cor de fundo do WebView - CRÍTICO para iOS (evita tela preta no overscroll)
  backgroundColor: '#0a0a0c',
  
  // Configurações específicas do iOS
  ios: {
    backgroundColor: '#0a0a0c',
    scrollEnabled: true,
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
