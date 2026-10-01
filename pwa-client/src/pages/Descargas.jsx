import React from 'react';
import { FiSmartphone, FiMonitor, FiDownload } from 'react-icons/fi';

const Descargas = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark mb-2">Centro de Descargas</h1>
          <p className="text-brand-muted">Descarga las aplicaciones de APPB para tus dispositivos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App Móvil */}
        <div className="card-modern p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue">
            <FiSmartphone size={32} />
          </div>
          <h2 className="text-xl font-semibold text-brand-dark">Aplicación Móvil (Android)</h2>
          <p className="text-sm text-brand-muted">
            Instala la aplicación en tu celular para crear incidencias, recibir notificaciones de Telegram y más.
          </p>
          <a
            href="/descargas/appb-incidencias.apk"
            download
            className="btn-primary w-full flex justify-center items-center py-3"
          >
            <FiDownload className="mr-2" />
            Descargar APK
          </a>
        </div>

        {/* App Escritorio */}
        <div className="card-modern p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-brand-light/10 rounded-full flex items-center justify-center text-brand-light">
            <FiMonitor size={32} />
          </div>
          <h2 className="text-xl font-semibold text-brand-dark">Aplicación de Escritorio (Windows)</h2>
          <p className="text-sm text-brand-muted">
            Panel completo para administradores y técnicos. Descarga y extrae el archivo ZIP para usar el ejecutable.
          </p>
          <a
            href="/descargas/appb-escritorio.zip"
            download
            className="btn-secondary w-full flex justify-center items-center py-3 bg-brand-dark text-white hover:bg-brand-dark/90"
          >
            <FiDownload className="mr-2" />
            Descargar ZIP (Windows)
          </a>
        </div>
      </div>
    </div>
  );
};

export default Descargas;
