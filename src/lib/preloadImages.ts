// Preload de imagens críticas do app
import horahSplashDark from '@/assets/horah-splash-dark.png';
import horahSplashLight from '@/assets/horah-splash-light.png';
import horahLogo from '@/assets/horah-logo.png';
import defaultAvatar from '@/assets/default-avatar.png';
import horahAvatarDark from '@/assets/horah-avatar-dark.png';

const criticalImages = [
  horahSplashDark,
  horahSplashLight,
  horahLogo,
  defaultAvatar,
  horahAvatarDark,
];

export const preloadCriticalImages = (): Promise<void[]> => {
  const promises = criticalImages.map((src) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Resolve mesmo em erro para não bloquear
      img.src = src;
    });
  });
  
  return Promise.all(promises);
};

// Preload imediato (não espera)
export const preloadCriticalImagesSync = () => {
  criticalImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
};
