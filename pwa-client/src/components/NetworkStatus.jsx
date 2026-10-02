import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    Network.getStatus().then(status => setIsOnline(status.connected));

    const checkStatus = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
    };

    let listener;
    Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected);
    }).then(l => listener = l);

    return () => {
      if (listener) listener.remove();
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-gray-800 text-white text-xs py-1.5 px-4 text-center fixed top-0 w-full z-[9999] flex justify-center items-center gap-2 shadow-md safe-area-pt">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
      Sin conexión a internet. Reconectando...
    </div>
  );
};
