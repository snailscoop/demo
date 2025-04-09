import { Badge } from '@mantine/core';
import { useState, useEffect } from 'react';

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Badge 
      color={isOnline ? 'green' : 'red'} 
      variant="light"
      size="lg"
    >
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  );
} 