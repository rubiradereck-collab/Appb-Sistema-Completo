import React, { createContext, useState, useEffect, useContext } from 'react';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15000); // ms
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { value: t } = await Preferences.get({ key: 'theme' });
    const { value: ar } = await Preferences.get({ key: 'autoRefresh' });
    const { value: ri } = await Preferences.get({ key: 'refreshInterval' });

    const loadedTheme = t ? JSON.parse(t) : 'system';
    const loadedAutoRefresh = ar ? JSON.parse(ar) : true;
    const loadedRefreshInterval = ri ? JSON.parse(ri) : 15000;

    setTheme(loadedTheme);
    setAutoRefresh(loadedAutoRefresh);
    setRefreshInterval(loadedRefreshInterval);

    applyTheme(loadedTheme);
    setSettingsLoaded(true);
  };

  const applyTheme = (currentTheme) => {
    const isDark = currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (Capacitor.isNativePlatform()) {
      StatusBar.setBackgroundColor({ color: isDark ? '#0f172a' : '#162d47' });
      StatusBar.setStyle({ style: Style.Dark }); // Texto claro
    }
  };

  useEffect(() => {
    if (!settingsLoaded) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, settingsLoaded]);

  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    await Preferences.set({ key: 'theme', value: JSON.stringify(newTheme) });
    applyTheme(newTheme);
  };

  const updateAutoRefresh = async (val) => {
    setAutoRefresh(val);
    await Preferences.set({ key: 'autoRefresh', value: JSON.stringify(val) });
  };

  const updateRefreshInterval = async (val) => {
    setRefreshInterval(val);
    await Preferences.set({ key: 'refreshInterval', value: JSON.stringify(val) });
  };

  return (
    <SettingsContext.Provider value={{ theme, updateTheme, autoRefresh, updateAutoRefresh, refreshInterval, updateRefreshInterval, settingsLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
};
