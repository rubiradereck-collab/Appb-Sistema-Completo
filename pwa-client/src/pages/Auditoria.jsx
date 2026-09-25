import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import api from '../api';
import { FiActivity } from 'react-icons/fi';

const Auditoria = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditoria = async () => {
      try {
        const res = await api.get('/auditoria');
        setLogs(res.data);
      } catch (error) {
        console.error('Error fetching auditoria:', error);
      }
      setLoading(false);
    };
    fetchAuditoria();
  }, []);

  return (
    <div className="flex flex-col h-full bg-brand-light pb-20">
      <Header />
      <main className="flex-1 p-4 lg:p-8 w-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner border border-purple-200">
              <FiActivity className="text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">Auditoría del Sistema</h2>
              <p className="text-sm text-gray-500 mt-1">Registro de actividad y cambios en el sistema</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 font-bold text-gray-400 animate-pulse">Cargando bitácora...</div>
        ) : (
          <div className="card-modern">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="table-header rounded-tl-2xl">Fecha</th>
                    <th className="table-header">Usuario</th>
                    <th className="table-header">Acción</th>
                    <th className="table-header">Entidad</th>
                    <th className="table-header rounded-tr-2xl">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {logs.length > 0 ? logs.map(log => (
                    <tr key={log.IdAuditoria} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="table-cell whitespace-nowrap text-gray-400 font-bold">
                        {new Date(log.Fecha).toLocaleString()}
                      </td>
                      <td className="table-cell font-bold text-brand-blue">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center text-[10px]">
                            {log.NombreUsuario?.charAt(0)}
                          </div>
                          <span>{log.NombreUsuario}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          log.Accion.toLowerCase().includes('crear') || log.Accion.toLowerCase().includes('insertar') ? 'bg-emerald-100 text-emerald-700' :
                          log.Accion.toLowerCase().includes('eliminar') ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-brand-blue'
                        }`}>
                          {log.Accion}
                        </span>
                      </td>
                      <td className="table-cell text-gray-700 font-medium">
                        {log.Entidad} {log.EntidadId ? <span className="text-gray-400 text-xs ml-1">#{log.EntidadId}</span> : ''}
                      </td>
                      <td className="table-cell text-gray-500 max-w-[200px] truncate" title={log.Detalle}>
                        {log.Detalle}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-gray-400 font-bold bg-gray-50/50">
                        No hay registros de auditoría.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Auditoria;
