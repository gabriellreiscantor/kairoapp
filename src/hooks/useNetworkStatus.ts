import { useState, useEffect, useCallback } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOffline) {
      // Reload the page when connection is restored
      window.location.reload();
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
};
