import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener;
    App.addListener('backButton', ({ canGoBack }) => {
      const mainRoutes = ['/dashboard', '/incidencias', '/mis-tickets', '/login'];
      if (mainRoutes.includes(location.pathname)) {
        const now = new Date().getTime();
        if (now - lastBackPress.current < 2000) {
          App.exitApp();
        } else {
          lastBackPress.current = now;
          window.dispatchEvent(new CustomEvent('app-success', { detail: 'Presiona atrás otra vez para salir' }));
        }
      } else {
        if (canGoBack) {
          navigate(-1);
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    }).then(l => listener = l);

    return () => {
      if (listener) listener.remove();
    };
  }, [location.pathname, navigate]);

  return null;
};
