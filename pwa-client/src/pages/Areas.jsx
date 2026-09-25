import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from '../components/Header';
import api from '../api';
import { FiLayers, FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload } from 'react-icons/fi';
import { exportGenericExcel, exportGenericPDF } from '../utils/exportUtils';

const Areas = () => {
  const { user } = useAuth();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nombreArea, setNombreArea] = useState('');
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Search
  const [search, setSearch] = useState('');

  const filteredAreas = areas.filter(a => 
    a.NombreArea.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const res = await api.get('/areas');
      setAreas(res.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/areas/${editingId}`, { NombreArea: nombreArea });
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Área modificada con éxito'}));
      } else {
        await api.post('/areas', { NombreArea: nombreArea });
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Área creada con éxito'}));
      }
      setShowModal(false);
      setNombreArea('');
      setEditingId(null);
      fetchAreas();
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al guardar área'}));
    }
  };

  const openEdit = (area) => {
    setEditingId(area.IdArea);
    setNombreArea(area.NombreArea);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Área',
      message: '¿Estás seguro de que deseas eliminar esta área?',
      onConfirm: async () => {
        setConfirmModal({ show: false });
        try {
          await api.delete(`/areas/${id}`);
          window.dispatchEvent(new CustomEvent('app-success', {detail: 'Área eliminada'}));
          fetchAreas();
        } catch (error) {
          window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al eliminar área'}));
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-brand-light pb-20">
      <Header />
      
      <main className="flex-1 p-4 lg:p-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shadow-inner border border-brand-blue/20">
              <FiLayers className="text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">Catálogo de Áreas</h2>
              <p className="text-sm text-gray-500 mt-1">Departamentos y secciones de la empresa</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => exportGenericPDF(areas, [
              { header: 'ID', key: 'IdArea', width: 'auto' },
              { header: 'NOMBRE DEL ÁREA', key: 'NombreArea', width: '*' }
            ], 'Listado de Áreas', `Areas_${new Date().toISOString().split('T')[0]}.pdf`)}
              className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a PDF">
              <FiDownload className="text-lg" />
            </button>
            <button onClick={() => exportGenericExcel(areas, [
              { header: 'ID', key: 'IdArea', width: 10 },
              { header: 'NOMBRE DEL ÁREA', key: 'NombreArea', width: 40 }
            ], `Areas_${new Date().toISOString().split('T')[0]}.xlsx`)}
              className="bg-green-50 hover:bg-green-100 text-green-600 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a Excel">
              <FiDownload className="text-lg" />
            </button>
            <button 
              onClick={() => { setEditingId(null); setNombreArea(''); setShowModal(true); }}
              className="btn-primary py-2.5 px-4 ml-2"
            >
              <FiPlus className="text-lg" /> <span className="hidden sm:inline">Nueva Área</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <FiSearch className="absolute left-4 top-4 text-gray-400 text-xl" />
          <input 
            type="text" 
            placeholder="Buscar área por nombre..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-modern pl-12 py-3.5 text-lg shadow-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 font-bold text-gray-400 animate-pulse">Cargando áreas...</div>
        ) : (
          <div className="card-modern">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="table-header rounded-tl-2xl">ID</th>
                    <th className="table-header">Nombre del Área</th>
                    <th className="table-header text-center rounded-tr-2xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredAreas.length > 0 ? filteredAreas.map(a => (
                    <tr key={a.IdArea} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="table-cell font-bold text-gray-400 w-20">#{a.IdArea}</td>
                      <td className="table-cell text-gray-800 font-bold">{a.NombreArea}</td>
                      <td className="table-cell text-center w-32">
                        <div className="flex justify-center space-x-1 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(a)} className="text-brand-blue hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Editar"><FiEdit2 size={18} /></button>
                          <button onClick={() => handleDelete(a.IdArea)} className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Eliminar"><FiTrash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-12 text-center text-gray-400 font-bold bg-gray-50/50">
                        No se encontraron áreas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 transform transition-all">
            <h3 className="text-2xl font-black text-brand-dark mb-6 flex items-center space-x-3">
              <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl"><FiLayers /></div>
              <span>{editingId ? 'Editar Área' : 'Crear Área'}</span>
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Nombre del Área</label>
                <input required type="text" maxLength={100} placeholder="Ej. Sistemas, Contabilidad..." className="input-modern" value={nombreArea} onChange={e => setNombreArea(e.target.value)} />
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setNombreArea(''); }} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <FiTrash2 className="text-3xl" />
            </div>
            <h2 className="text-xl font-black text-brand-dark mb-2">{confirmModal.title}</h2>
            <p className="text-gray-500 mb-6 text-sm">{confirmModal.message}</p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => setConfirmModal({ show: false })}
                className="flex-1 btn-secondary py-2.5"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 btn-primary py-2.5 bg-red-500 hover:bg-red-600 shadow-red-500/20 text-white border-transparent"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Areas;
