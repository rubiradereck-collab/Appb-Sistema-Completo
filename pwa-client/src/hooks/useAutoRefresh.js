import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export function useAutoRefresh(callback, delay) {
  const savedCallback = useRef(callback);
  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);
  const isWaitingForConnectionRef = useRef(false);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    let isCancelled = false;
    let networkListener = null;
    let appListener = null;

    const executeIfConnected = async () => {
      const status = await Network.getStatus();
      if (status.connected && !isCancelled) {
        savedCallback.current(true);
      }
    };

    const tick = async () => {
      if (!isActiveRef.current || isWaitingForConnectionRef.current || isCancelled) return;
      executeIfConnected();
    };

    intervalRef.current = setInterval(tick, delay);

    const handleNetworkRestore = async (status) => {
      if (status.connected && isWaitingForConnectionRef.current && isActiveRef.current && !isCancelled) {
        isWaitingForConnectionRef.current = false;
        savedCallback.current(true);
      }
    };

    Network.addListener('networkStatusChange', handleNetworkRestore).then(l => {
      if (isCancelled) {
        l.remove();
      } else {
        networkListener = l;
      }
    });

    const handleStateChange = async (state) => {
      if (isCancelled) return;
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

    const handleVisibilityChange = () => {
      handleStateChange({ isActive: document.visibilityState === 'visible' });
    };

    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', handleStateChange).then(l => {
        if (isCancelled) {
          l.remove();
        } else {
          appListener = l;
        }
      });
    } else {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isCancelled = true;
      clearInterval(intervalRef.current);
      if (networkListener) networkListener.remove();
      if (appListener) {
        appListener.remove();
      } else if (!Capacitor.isNativePlatform()) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [delay]);
}
