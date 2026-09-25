import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import Header from '../components/Header';
import { FiArrowLeft, FiClock, FiUser, FiInfo } from 'react-icons/fi';

const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [incidencia, setIncidencia] = useState(null);
  const [estados, setEstados] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, isDestructive: false });

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const [incRes, estRes, areaRes] = await Promise.all([
        api.get(`/incidencias/${id}`),
        api.get('/estados'),
        api.get('/areas')
      ]);
      setIncidencia(incRes.data);
      setEstados(estRes.data);
      setAreas(areaRes.data);
      setNuevoEstado(incRes.data.IdEstado);
      setObservaciones(incRes.data.Observaciones || '');
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    setGuardando(true);
    try {
      await api.put(`/incidencias/${id}`, {
        IdEstado: nuevoEstado,
        Observaciones: observaciones
      });
      window.dispatchEvent(new CustomEvent('app-success', {detail: 'Incidencia actualizada'}));
      fetchDetail();
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al actualizar'}));
    }
    setGuardando(false);
  };

  const handleAssignToMe = () => {
    setConfirmModal({
      show: true,
      title: 'Asignar Ticket',
      message: '¿Estás seguro de que deseas asignarte este ticket?',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal({ show: false });
        setGuardando(true);
        try {
          await api.put(`/incidencias/${id}`, {
            IdTecnicoAsignado: user.IdUsuario,
            IdEstado: 2 // En Proceso
          });
          window.dispatchEvent(new CustomEvent('app-success', {detail: 'Ticket asignado'}));
          fetchDetail();
        } catch (error) {
          window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al asignar'}));
        }
        setGuardando(false);
      }
    });
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (!incidencia) return <div className="p-8 text-center text-red-500">No se encontró la incidencia</div>;

  const isTechOrAdmin = user.Rol === 'Técnico' || user.Rol === 'Administrador';
  const areaName = areas.find(a => a.IdArea === incidencia.IdArea)?.NombreArea || 'N/A';

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-10">
      <Header />
      <main className="p-4 max-w-3xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="flex items-center text-blue-600 mb-4 py-2 font-medium">
          <FiArrowLeft className="mr-2" /> Volver
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex justify-between items-start mb-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{incidencia.NumeroTicket}</h1>
              <p className="text-gray-500 text-sm flex items-center mt-1">
                <FiClock className="mr-1" /> {new Date(incidencia.Fecha).toLocaleString()}
              </p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              {estados.find(e => e.IdEstado === incidencia.IdEstado)?.NombreEstado}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Reportado por</p>
              <p className="font-medium text-gray-800 flex items-center mt-1"><FiUser className="mr-2 text-gray-400"/>{incidencia.Empleado}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Área</p>
              <p className="font-medium text-gray-800 mt-1">{areaName}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase font-semibold">Tipo</p>
              <p className="font-medium text-gray-800 mt-1">{incidencia.TipoIncidencia}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Descripción</p>
            <p className="text-gray-700 whitespace-pre-wrap">{incidencia.Descripcion}</p>
          </div>

          {/* Acciones para Técnicos / Admins */}
          {isTechOrAdmin && (
            <div className="mt-8 border-t pt-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Gestión del Ticket</h3>
              
              {!incidencia.IdTecnicoAsignado ? (
                <button 
                  onClick={handleAssignToMe}
                  disabled={guardando}
                  className="w-full bg-blue-100 text-blue-700 font-bold py-3 rounded-xl mb-4 flex items-center justify-center hover:bg-blue-200 transition-colors"
                >
                  <FiUser className="mr-2" /> Asignarme este ticket
                </button>
              ) : (
                <div className="bg-green-50 text-green-800 p-3 rounded-xl flex items-center mb-4 text-sm font-medium">
                  <FiInfo className="mr-2 flex-shrink-0" size={18} /> 
                  Este ticket ya está asignado.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cambiar Estado</label>
                  <select 
                    value={nuevoEstado} 
                    onChange={e => setNuevoEstado(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {estados.map(e => (
                      <option key={e.IdEstado} value={e.IdEstado}>{e.NombreEstado}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones / Resolución</label>
                  <textarea 
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    rows={4}
                    placeholder="Agrega notas internas o detalles de la solución..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button 
                  onClick={handleUpdate}
                  disabled={guardando}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Actualizar Incidencia'}
                </button>
                
                {user?.Rol === 'Administrador' && (
                  <button 
                    onClick={() => {
                      setConfirmModal({
                        show: true,
                        title: 'Eliminar Incidencia',
                        message: '¿Estás seguro de que deseas ELIMINAR permanentemente esta incidencia? Esta acción no se puede deshacer.',
                        isDestructive: true,
                        onConfirm: async () => {
                          setConfirmModal({ show: false });
                          try {
                            await api.delete(`/incidencias/${id}`);
                            window.dispatchEvent(new CustomEvent('app-success', {detail: 'Incidencia eliminada exitosamente.'}));
                            navigate('/incidencias');
                          } catch (error) {
                            window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al eliminar incidencia.'}));
                          }
                        }
                      });
                    }}
                    className="w-full mt-2 bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200 transition-colors"
                  >
                    Eliminar Incidencia
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Vista de observaciones para Usuarios */}
          {!isTechOrAdmin && incidencia.Observaciones && (
             <div className="mt-6 border-t pt-4">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Respuesta del Técnico</p>
                <div className="bg-blue-50 text-blue-900 p-4 rounded-xl text-sm whitespace-pre-wrap">
                  {incidencia.Observaciones}
                </div>
             </div>
          )}

          {/* MOCK: Historial / Auditoría Visual */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="font-bold text-lg text-[#162d47] mb-6 flex items-center">
              <FiClock className="mr-2" /> Historial de la Incidencia
            </h3>
            
            <div className="relative border-l-2 border-[#2988c9] ml-3 space-y-6 pb-4">
              <div className="relative pl-6">
                <div className="absolute w-4 h-4 bg-[#2988c9] rounded-full -left-[9px] top-1 border-2 border-white shadow-sm"></div>
                <p className="text-sm font-bold text-gray-800">Incidencia Creada</p>
                <p className="text-xs text-gray-500">{new Date(incidencia.Fecha).toLocaleString()} - Por {incidencia.Empleado}</p>
              </div>

              {incidencia.IdTecnicoAsignado && (
                <div className="relative pl-6">
                  <div className="absolute w-4 h-4 bg-[#f59e0b] rounded-full -left-[9px] top-1 border-2 border-white shadow-sm"></div>
                  <p className="text-sm font-bold text-gray-800">Ticket Asignado</p>
                  <p className="text-xs text-gray-500">El ticket fue asignado a un técnico y se encuentra En Proceso.</p>
                </div>
              )}

              {incidencia.IdEstado >= 3 && (
                <div className="relative pl-6">
                  <div className="absolute w-4 h-4 bg-[#10b981] rounded-full -left-[9px] top-1 border-2 border-white shadow-sm"></div>
                  <p className="text-sm font-bold text-gray-800">Estado actualizado a Resuelto</p>
                  <p className="text-xs text-gray-500">El técnico ha marcado el ticket como resuelto.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 transition-transform">
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{confirmModal.title}</h2>
              <p className="text-gray-600 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal({ show: false })}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 text-white font-bold py-3 px-4 rounded-xl transition-colors ${confirmModal.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentDetail;
