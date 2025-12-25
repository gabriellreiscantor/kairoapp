import { useState, useEffect, useCallback } from 'react';
import { remoteLog } from '@/lib/remoteLogger';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    remoteLog.info('network', 'went_online', { wasOffline });
    setIsOnline(true);
    if (wasOffline) {
      // Reload the page when connection is restored
      window.location.reload();
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    remoteLog.warn('network', 'went_offline');
    setIsOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    // Log initial network state
    remoteLog.info('network', 'status_initialized', { isOnline: navigator.onLine });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
};
