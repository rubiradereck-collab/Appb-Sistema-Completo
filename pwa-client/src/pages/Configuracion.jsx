import React, { useState, useEffect } from 'react';
import { FiMonitor, FiMoon, FiSun, FiRefreshCcw, FiUser, FiLogOut, FiInfo, FiChevronRight } from 'react-icons/fi';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../AuthContext';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

export const Configuracion = () => {
  const { theme, updateTheme, autoRefresh, updateAutoRefresh, refreshInterval, updateRefreshInterval } = useSettings();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [appVersion, setAppVersion] = useState('1.0.0');

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.getInfo().then(info => setAppVersion(info.version)).catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Configuración</h1>

      {/* Sección Apariencia */}
      <div className="card-modern p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Apariencia</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-brand-light dark:bg-gray-700 rounded-lg text-brand-blue dark:text-blue-400">
                {theme === 'light' ? <FiSun size={20} /> : theme === 'dark' ? <FiMoon size={20} /> : <FiMonitor size={20} />}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Tema de la aplicación</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Selecciona el modo visual</p>
              </div>
            </div>
            <select
              value={theme}
              onChange={(e) => updateTheme(e.target.value)}
              className="input-modern py-2 pl-3 pr-8 w-auto text-sm"
            >
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sección Sincronización */}
      <div className="card-modern p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Sincronización</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-brand-light dark:bg-gray-700 rounded-lg text-brand-blue dark:text-blue-400">
                <FiRefreshCcw size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Actualización automática</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Recargar datos en segundo plano</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={autoRefresh} onChange={(e) => updateAutoRefresh(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-blue"></div>
            </label>
          </div>

          {autoRefresh && (
            <div className="flex items-center justify-between pl-12 border-t border-gray-100 dark:border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Intervalo</p>
              <select
                value={refreshInterval}
                onChange={(e) => updateRefreshInterval(Number(e.target.value))}
                className="input-modern py-2 pl-3 pr-8 w-auto text-sm"
              >
                <option value={15000}>15 segundos</option>
                <option value={30000}>30 segundos</option>
                <option value={60000}>60 segundos</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Sección Cuenta */}
      <div className="card-modern p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Cuenta</h2>
        
        <div className="space-y-2">
          {/* We will add real Profile routing later if needed. For now, it's just visual or redirects to dashboard */}
          <button className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-brand-light dark:bg-gray-700 rounded-lg text-brand-blue dark:text-blue-400">
                <FiUser size={20} />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Mi Perfil</p>
            </div>
            <FiChevronRight className="text-gray-400" />
          </button>

          <button onClick={handleLogout} className="w-full flex items-center justify-between p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400">
                <FiLogOut size={20} />
              </div>
              <p className="font-semibold text-red-600 dark:text-red-400">Cerrar Sesión</p>
            </div>
          </button>
        </div>
      </div>

      {/* Sección Acerca de */}
      <div className="card-modern p-4">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Acerca de</h2>
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-brand-light dark:bg-gray-700 rounded-lg text-brand-blue dark:text-blue-400">
            <FiInfo size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">APPB Incidencias</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Versión {appVersion}</p>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
          <p>© 2026 Institución APPB</p>
          <a href="https://t.me/TuBotDeTelegram" target="_blank" rel="noopener noreferrer" className="text-brand-blue dark:text-blue-400 font-medium hover:underline mt-1 inline-block">
            Contactar al bot de soporte
          </a>
        </div>
      </div>
    </div>
  );
};
