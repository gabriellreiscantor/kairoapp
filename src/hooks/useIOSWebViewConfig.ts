import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook para configurar o WebView no iOS
 * Desabilita o bounce/rubber-band effect que causa a tela preta
 */
export const useIOSWebViewConfig = () => {
  useEffect(() => {
    const configureIOSWebView = async () => {
      // Só executa no iOS nativo
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
        return;
      }

      try {
        // Import dinâmico para evitar erros na web
        const { setWebviewBounce } = await import('capacitor-plugin-ios-webview-configurator');
        
        // Desabilita o bounce do WebView
        setWebviewBounce(false);
        
        console.log('[iOS WebView] Bounce desabilitado com sucesso');
      } catch (error) {
        console.warn('[iOS WebView] Erro ao configurar:', error);
        
        // Fallback: tentar via CSS/JS
        try {
          document.body.style.overscrollBehavior = 'none';
          document.documentElement.style.overscrollBehavior = 'none';
        } catch (cssError) {
          console.warn('[iOS WebView] Fallback CSS também falhou:', cssError);
        }
      }
    };

    configureIOSWebView();
  }, []);
};

export default useIOSWebViewConfig;
