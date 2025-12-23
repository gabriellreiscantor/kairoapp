import { useIOSWebViewConfig } from '@/hooks/useIOSWebViewConfig';

/**
 * Componente que configura o WebView no iOS
 * Desabilita o bounce que causa a tela preta no overscroll
 */
const IOSWebViewConfigurator = () => {
  useIOSWebViewConfig();
  return null;
};

export default IOSWebViewConfigurator;
