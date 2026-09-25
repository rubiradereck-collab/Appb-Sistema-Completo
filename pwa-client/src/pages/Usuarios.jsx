import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from '../components/Header';
import api from '../api';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { exportGenericExcel, exportGenericPDF } from '../utils/exportUtils';

const Usuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de Crear/Editar
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    Nombre: '',
    Apellido: '',
    Correo: '',
    UsuarioLogin: '',
    Password: '',
    Rol: 'Usuario',
    Estado: true
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleOpenEdit = (usuario) => {
    setIsEditing(true);
    setEditingId(usuario.IdUsuario);
    setFormData({
      Nombre: usuario.Nombre,
      Apellido: usuario.Apellido,
      Correo: usuario.Correo,
      UsuarioLogin: usuario.Usuario || usuario.UsuarioLogin, // support both depending on API mapping
      Password: '', // Don't fetch password
      Rol: usuario.Rol,
      Estado: usuario.Estado
    });
    setShowModal(true);
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/usuarios/${editingId}`, formData);
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Usuario modificado con éxito'}));
      } else {
        await api.post('/usuarios', formData);
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Usuario creado con éxito'}));
      }
      setShowModal(false);
      setFormData(initialForm);
      fetchUsuarios();
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al guardar usuario'}));
    }
  };

  const [confirmModal, setConfirmModal] = useState({ show: false, idUsuario: null });

  const handleDelete = (idUsuario) => {
    setConfirmModal({ show: true, idUsuario });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/usuarios/${confirmModal.idUsuario}`);
      window.dispatchEvent(new CustomEvent('app-success', {detail: 'Usuario eliminado'}));
      fetchUsuarios();
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al eliminar usuario'}));
    }
    setConfirmModal({ show: false, idUsuario: null });
  };

  const [passwordModal, setPasswordModal] = useState({ show: false, idUsuario: null, nombreUsuario: '', newPassword: '' });

  const handleResetPassword = async () => {
    try {
      const res = await api.post(`/usuarios/${passwordModal.idUsuario}/reset-password`);
      setPasswordModal(prev => ({ 
        ...prev, 
        newPassword: res.data.nuevaPassword || res.data.password || 'TEMP123' 
      }));
      window.dispatchEvent(new CustomEvent('app-success', {detail: 'Contraseña temporal generada exitosamente.'}));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al generar la contraseña.'}));
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-light pb-20">
      <Header />
      
      <main className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shadow-inner border border-brand-blue/20">
              <FiUsers className="text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">Gestión de Usuarios</h2>
              <p className="text-sm text-gray-500 mt-1">Administración de cuentas y permisos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => exportGenericPDF(usuarios, [
              { header: 'ID', key: 'IdUsuario', width: 'auto' },
              { header: 'NOMBRE', key: 'Nombre', width: '*' },
              { header: 'APELLIDO', key: 'Apellido', width: '*' },
              { header: 'CORREO', key: 'Correo', width: '*' },
              { header: 'ROL', key: 'Rol', width: 'auto' },
              { header: 'ESTADO', key: 'estadoTexto', getValue: (u) => u.Estado ? 'Activo' : 'Inactivo', width: 'auto' }
            ], 'Listado de Usuarios', `Usuarios_${new Date().toISOString().split('T')[0]}.pdf`)}
              className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a PDF">
              <FiDownload className="text-lg" />
            </button>
            <button onClick={() => exportGenericExcel(usuarios, [
              { header: 'ID', key: 'IdUsuario', width: 10 },
              { header: 'NOMBRE', key: 'Nombre', width: 25 },
              { header: 'APELLIDO', key: 'Apellido', width: 25 },
              { header: 'CORREO', key: 'Correo', width: 30 },
              { header: 'ROL', key: 'Rol', width: 15 },
              { header: 'ESTADO', key: 'estadoTexto', getValue: (u) => u.Estado ? 'Activo' : 'Inactivo', width: 15 }
            ], `Usuarios_${new Date().toISOString().split('T')[0]}.xlsx`)}
              className="bg-green-50 hover:bg-green-100 text-green-600 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a Excel">
              <FiDownload className="text-lg" />
            </button>
            <button 
              onClick={handleOpenCreate}
              className="btn-primary py-2.5 px-4 ml-2"
            >
              <FiPlus className="text-lg" /> <span className="hidden sm:inline">Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 font-bold text-gray-400 animate-pulse">Cargando usuarios...</div>
        ) : (
          <div className="card-modern">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="table-header rounded-tl-2xl">Nombre</th>
                    <th className="table-header">Usuario</th>
                    <th className="table-header">Rol</th>
                    <th className="table-header">Estado</th>
                    <th className="table-header text-center rounded-tr-2xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {usuarios.map(u => (
                    <tr key={u.IdUsuario} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="table-cell">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-xs uppercase">
                            {u.Nombre?.charAt(0)}
                          </div>
                          <span className="font-bold text-gray-800">{u.Nombre} {u.Apellido}</span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600 font-medium">{u.Usuario || u.UsuarioLogin}</td>
                      <td className="table-cell">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          u.Rol === 'Administrador' ? 'bg-purple-100 text-purple-700' :
                          u.Rol === 'Técnico' ? 'bg-blue-100 text-brand-blue' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.Rol}
                        </span>
                      </td>
                      <td className="table-cell">
                        {u.Estado ? (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Activo</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Inactivo</span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex justify-center space-x-1 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setPasswordModal({ show: true, idUsuario: u.IdUsuario, nombreUsuario: u.Nombre, newPassword: '' })}
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition-colors" title="Generar Contraseña Temporal">
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                          </button>
                          <button className="text-brand-blue hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Editar" onClick={() => handleOpenEdit(u)}><FiEdit2 size={18} /></button>
                          <button className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Eliminar" onClick={() => handleDelete(u.IdUsuario)}><FiTrash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 transform transition-all">
            <h3 className="text-2xl font-black text-brand-dark mb-6 flex items-center space-x-3">
              <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl"><FiUsers /></div>
              <span>{isEditing ? 'Editar Usuario' : 'Crear Usuario'}</span>
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Nombre</label>
                  <input required type="text" maxLength={50} className="input-modern" value={formData.Nombre} onChange={e => setFormData({...formData, Nombre: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Apellido</label>
                  <input required type="text" maxLength={50} className="input-modern" value={formData.Apellido} onChange={e => setFormData({...formData, Apellido: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Correo Electrónico</label>
                <input required type="email" maxLength={100} className="input-modern" value={formData.Correo} onChange={e => setFormData({...formData, Correo: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Usuario</label>
                  <input required type="text" maxLength={50} className="input-modern" value={formData.UsuarioLogin} onChange={e => setFormData({...formData, UsuarioLogin: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Contraseña</label>
                  <input required={!isEditing} placeholder={isEditing ? "(Sin cambios)" : ""} type="password" className="input-modern" value={formData.Password} onChange={e => setFormData({...formData, Password: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Rol</label>
                <select className="input-modern" value={formData.Rol} onChange={e => setFormData({...formData, Rol: e.target.value})}>
                  <option value="Usuario">Usuario (Empleado)</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <input type="checkbox" className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" checked={formData.Estado} onChange={e => setFormData({...formData, Estado: e.target.checked})} />
                  <span className="text-sm font-bold text-gray-700">Usuario Activo</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">{isEditing ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Password */}
      {passwordModal.show && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="bg-brand-dark p-5 text-white font-bold flex items-center justify-between">
              <span>Restablecer Contraseña</span>
              <button onClick={() => setPasswordModal({ show: false, idUsuario: null, nombreUsuario: '', newPassword: '' })} className="text-gray-400 hover:text-white transition-colors"><FiX /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4 font-medium">¿Estás seguro que deseas generar una nueva contraseña temporal para <strong>{passwordModal.nombreUsuario}</strong>?</p>
              
              {passwordModal.newPassword ? (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Nueva Contraseña</p>
                  <p className="font-mono text-2xl font-black tracking-widest text-emerald-600">{passwordModal.newPassword}</p>
                  <p className="text-xs text-gray-500 mt-2">Cópiala. El usuario deberá cambiarla al iniciar sesión.</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-6 bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-700">La nueva contraseña se autogenerará de forma segura.</p>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                {passwordModal.newPassword ? (
                  <button onClick={() => setPasswordModal({ show: false, idUsuario: null, nombreUsuario: '', newPassword: '' })} className="w-full btn-primary py-2.5">Entendido</button>
                ) : (
                  <>
                    <button onClick={() => setPasswordModal({ show: false, idUsuario: null, nombreUsuario: '', newPassword: '' })} className="flex-1 btn-secondary py-2.5">Cancelar</button>
                    <button onClick={handleResetPassword} className="flex-1 btn-primary py-2.5 bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white">Generar</button>
                  </>
                )}
              </div>
            </div>
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
            <h3 className="text-xl font-black text-brand-dark mb-2">Eliminar Usuario</h3>
            <p className="text-gray-500 mb-6 text-sm">¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.</p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => setConfirmModal({ show: false, idUsuario: null })}
                className="flex-1 btn-secondary py-2.5"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
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

export default Usuarios;
