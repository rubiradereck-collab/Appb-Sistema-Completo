import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export function useAutoRefresh(callback, delay) {
  const savedCallback = useRef(callback);
  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);
  const isWaitingForConnectionRef = useRef(false);
  const networkListenerRef = useRef(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const executeIfConnected = async () => {
      const status = await Network.getStatus();
      if (status.connected) {
        savedCallback.current(true);
      }
    };

    const tick = async () => {
      if (!isActiveRef.current || isWaitingForConnectionRef.current) return;
      executeIfConnected();
    };

    intervalRef.current = setInterval(tick, delay);

    const handleNetworkRestore = async (status) => {
      if (status.connected && isWaitingForConnectionRef.current && isActiveRef.current) {
        isWaitingForConnectionRef.current = false;
        savedCallback.current(true);
      }
    };

    Network.addListener('networkStatusChange', handleNetworkRestore).then(l => {
      networkListenerRef.current = l;
    });

    const handleStateChange = async (state) => {
      isActiveRef.current = state.isActive;
      if (state.isActive) {
        const status = await Network.getStatus();
        if (status.connected) {
          isWaitingForConnectionRef.current = false;
          savedCallback.current(true);
        } else {
          isWaitingForConnectionRef.current = true;
        }
      }
    };

    let appListener;
    const handleVisibilityChange = () => {
      handleStateChange({ isActive: document.visibilityState === 'visible' });
    };

    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', handleStateChange).then(l => {
        appListener = l;
      });
    } else {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(intervalRef.current);
      if (networkListenerRef.current) networkListenerRef.current.remove();
      if (appListener) {
        appListener.remove();
      } else if (!Capacitor.isNativePlatform()) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [delay]);
}
