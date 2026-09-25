import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from '../components/Header';
import api from '../api';
import { FiBook, FiChevronDown, FiChevronUp, FiPlus, FiEdit2, FiTrash2, FiSearch, FiMail, FiDownload } from 'react-icons/fi';
import { exportGuiasExcel, exportGuiasPDF } from '../utils/exportUtils';

const Guias = () => {
  const { user } = useAuth();
  const isAdmin = user && user.Rol === 'Administrador';
  const [guias, setGuias] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // CRUD State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const initialForm = { Titulo: '', Problema: '', Solucion: '' };
  const [formData, setFormData] = useState(initialForm);

  // Delete State
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null });

  // Email State
  const [emailModal, setEmailModal] = useState({ show: false, id: null, correoDestino: '' });

  const fetchGuias = async () => {
    try {
      const res = await api.get('/guias');
      setGuias(res.data);
    } catch (error) {
      console.error('Error al obtener guías', error);
    }
  };

  useEffect(() => {
    fetchGuias();
  }, []);

  const filteredGuias = guias.filter(g => 
    g.Titulo.toLowerCase().includes(search.toLowerCase()) || 
    g.Problema.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // CRUD Handlers
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (e, guia) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(guia.IdGuia);
    setFormData({ Titulo: guia.Titulo, Problema: guia.Problema, Solucion: guia.Solucion });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/guias/${editingId}`, formData);
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Guía actualizada'}));
      } else {
        await api.post('/guias', formData);
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Guía creada'}));
      }
      setShowModal(false);
      fetchGuias();
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al guardar'}));
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setConfirmModal({ show: true, id });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/guias/${confirmModal.id}`);
      window.dispatchEvent(new CustomEvent('app-success', {detail: 'Guía eliminada'}));
      fetchGuias();
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al eliminar'}));
    }
    setConfirmModal({ show: false, id: null });
  };

  const handleOpenEmailList = () => {
    setEmailModal({ show: true, correoDestino: '' });
  };

  const executeSendEmailList = async (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('app-success', {detail: 'Iniciando envío de Guías...'}));
    try {
      const pdfBase64 = await exportGuiasPDF(
        guias, 
        'Catálogo de Guías de Ayuda', 
        `Guias_${new Date().toISOString().split('T')[0]}.pdf`, 
        true
      );
      
      window.dispatchEvent(new CustomEvent('app-success', {detail: 'Llamando a la API...'}));
      await api.post('/reportes/enviar', {
        email: emailModal.correoDestino,
        pdfBase64,
        filename: `GuiasDeAyuda_${new Date().toISOString().split('T')[0]}.pdf`
      });
      window.dispatchEvent(new CustomEvent('app-success', {detail: 'Guías enviadas por correo exitosamente'}));
      setEmailModal({ show: false, correoDestino: '' });
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error en la petición de correo'}));
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-light pb-20">
      <Header />
      
      <main className="flex-1 p-4 lg:p-8 w-full max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shadow-inner border border-brand-blue/20">
              <FiBook className="text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">Guías Rápidas</h2>
              <p className="text-sm text-gray-500 mt-1">Base de conocimiento para problemas comunes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleOpenEmailList}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Enviar Guías por Correo">
              <FiMail className="text-lg" />
            </button>
            <button onClick={() => exportGuiasPDF(
                guias, 
                'Listado de Guías', 
                `Guias_${new Date().toISOString().split('T')[0]}.pdf`
              )}
              className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a PDF">
              <FiDownload className="text-lg" />
            </button>
            <button onClick={() => exportGuiasExcel(
                guias, 
                `Guias_${new Date().toISOString().split('T')[0]}.xlsx`
              )}
              className="bg-green-50 hover:bg-green-100 text-green-600 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a Excel">
              <FiDownload className="text-lg" />
            </button>
            {isAdmin && (
              <button 
                onClick={handleOpenCreate}
                className="btn-primary py-2.5 px-4 ml-2"
              >
                <FiPlus className="text-lg" /> <span className="hidden sm:inline">Nueva Guía</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <FiSearch className="absolute left-4 top-4 text-gray-400 text-xl" />
          <input 
            type="text" 
            placeholder="Buscar solución (ej. impresora, red...)" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-modern pl-12 py-3.5 text-lg shadow-sm"
          />
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {filteredGuias.length > 0 ? filteredGuias.map(guia => (
            <div key={guia.IdGuia} className="card-modern overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 border-l-brand-blue">
              {/* Header / Triggers */}
              <button 
                onClick={() => toggleExpand(guia.IdGuia)}
                className="w-full text-left p-5 flex items-center justify-between hover:bg-gray-50/50 focus:outline-none transition-colors"
              >
                <div className="flex-1 pr-6">
                  <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{guia.Titulo}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{guia.Problema}</p>
                </div>
                <div className={`p-2 rounded-full transition-all duration-300 ${expandedId === guia.IdGuia ? 'bg-brand-blue/10 text-brand-blue rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                  <FiChevronDown className="text-xl" />
                </div>
              </button>

              {/* Content / Body */}
              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expandedId === guia.IdGuia ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6 pt-2 bg-gradient-to-b from-transparent to-gray-50/50 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="relative">
                      <div className="absolute -left-2 top-0 bottom-0 w-1 bg-red-400 rounded-r"></div>
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest pl-2">Problema Reportado</span>
                      <p className="text-sm text-gray-700 mt-2 p-4 bg-white rounded-xl border border-gray-100 whitespace-pre-wrap shadow-sm">{guia.Problema}</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-2 top-0 bottom-0 w-1 bg-emerald-400 rounded-r"></div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest pl-2">Solución Técnica</span>
                      <p className="text-sm text-gray-800 mt-2 font-medium bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 whitespace-pre-wrap shadow-sm">{guia.Solucion}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    {isAdmin && (
                      <>
                        <button onClick={(e) => handleOpenEdit(e, guia)} className="flex items-center space-x-2 text-sm font-bold text-brand-blue py-2 px-4 hover:bg-brand-blue/10 rounded-xl transition-colors" title="Editar"><FiEdit2 /> <span>Editar</span></button>
                        <button onClick={(e) => handleDelete(e, guia.IdGuia)} className="flex items-center space-x-2 text-sm font-bold text-red-500 py-2 px-4 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar"><FiTrash2 /> <span>Eliminar</span></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="card-modern p-12 text-center border-dashed border-2 border-gray-200 shadow-none">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiBook className="text-gray-400 text-2xl" />
              </div>
              <p className="text-gray-500 font-bold text-lg">No se encontraron guías.</p>
              <p className="text-gray-400 text-sm mt-1">Intenta con otros términos de búsqueda.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal CRUD Guia */}
      {showModal && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 transform transition-all">
            <h3 className="text-2xl font-black text-brand-dark mb-6 flex items-center space-x-3">
              <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl"><FiBook /></div>
              <span>{isEditing ? 'Editar Guía' : 'Nueva Guía'}</span>
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Título</label>
                <input 
                  type="text" 
                  value={formData.Titulo} 
                  onChange={e => setFormData({...formData, Titulo: e.target.value})} 
                  className="input-modern"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Problema</label>
                <textarea 
                  value={formData.Problema} 
                  onChange={e => setFormData({...formData, Problema: e.target.value})} 
                  className="input-modern min-h-[100px] resize-y"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Solución</label>
                <textarea 
                  value={formData.Solucion} 
                  onChange={e => setFormData({...formData, Solucion: e.target.value})} 
                  className="input-modern min-h-[120px] resize-y"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">{isEditing ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiTrash2 className="text-3xl text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Eliminar Guía</h3>
            <p className="text-gray-500 mb-6">¿Estás seguro de que deseas eliminar esta guía?</p>
            <div className="flex justify-center space-x-3">
              <button onClick={() => setConfirmModal({ show: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 font-bold text-gray-700 rounded-xl hover:bg-gray-200">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-500 font-bold text-white rounded-xl hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Email */}
      {emailModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiMail className="text-3xl text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Enviar Catálogo de Guías</h3>
            <p className="text-gray-500 mb-4 text-sm">Ingresa el correo del destinatario:</p>
            <form onSubmit={executeSendEmailList}>
              <input 
                type="email" 
                required 
                className="w-full p-2 border border-gray-300 rounded mb-4 text-center text-lg focus:outline-none focus:border-[#2988c9]" 
                value={emailModal.correoDestino} 
                onChange={e => setEmailModal({...emailModal, correoDestino: e.target.value})} 
                placeholder="ejemplo@correo.com"
              />
              <div className="flex space-x-3">
                <button type="button" onClick={() => setEmailModal({ show: false, correoDestino: '' })} className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-[#2988c9] text-white font-bold py-2 rounded-lg hover:bg-[#162d47] transition-colors">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Guias;
