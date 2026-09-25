import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from '../components/Header';
import { FiCamera, FiTrash2, FiMessageCircle, FiSave, FiLock, FiUser } from 'react-icons/fi';
import api from '../api';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    Nombre: user?.Nombre || '',
    Apellido: user?.Apellido || '',
    Correo: user?.Correo || '',
    Usuario: user?.UsuarioLogin || '',
    Rol: user?.Rol || '',
    PasswordActual: '',
    PasswordNueva: '',
    PasswordConfirma: ''
  });

  const [telegramChatId, setTelegramChatId] = useState(null);

  useEffect(() => {
    // Si el usuario ya tiene foto (en base64 guardado en su objeto)
    if (user?.FotoPerfil) {
      setPhotoPreview(user.FotoPerfil);
    }
    
    // Traer perfil fresco para ver si ya vinculó Telegram
    const fetchPerfil = async () => {
      try {
        const res = await api.get('/perfil');
        if (res.data) {
          setTelegramChatId(res.data.TelegramChatId);
        }
      } catch (err) {
        console.error('Error al cargar perfil fresco', err);
      }
      setLoading(false);
    };
    fetchPerfil();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        setPhotoPreview(base64String);
        try {
          await api.post('/perfil/foto', { FotoPerfil: base64String });
          updateUser({ FotoPerfil: base64String });
          window.dispatchEvent(new CustomEvent('app-success', {detail: 'Foto actualizada exitosamente'}));
        } catch(err) {
          window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al actualizar la foto'}));
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, isDestructive: false });

  const handleRemovePhoto = () => {
    setConfirmModal({
      show: true,
      title: 'Quitar Foto',
      message: '¿Estás seguro de que deseas quitar tu foto de perfil?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal({ show: false });
        try {
          await api.delete('/perfil/foto');
          setPhotoPreview(null);
          updateUser({ FotoPerfil: null });
          window.dispatchEvent(new CustomEvent('app-success', {detail: 'Foto eliminada exitosamente'}));
        } catch(err) {
          window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al quitar foto'}));
        }
      }
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('app-success', {detail: 'Perfil guardado exitosamente'}));
  };

  const handleTelegram = () => {
    window.open('tg://resolve?domain=TuBotDeAPPB', '_blank');
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${user?.Nombre}+${user?.Apellido}&background=2988c9&color=fff&size=128`;

  return (
    <div className="flex flex-col h-full relative pb-20 bg-gray-50">
      <Header />
      
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-black text-[#162d47] mb-6">Perfil de Usuario</h2>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Foto Profile Section */}
          <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200 flex flex-col items-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 overflow-hidden shadow-inner flex items-center justify-center border-4 border-white shadow-lg">
              <img src={photoPreview || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex space-x-3 w-full max-w-xs">
              <label className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-sm font-bold text-sm transition-colors cursor-pointer">
                <FiCamera />
                <span>Cambiar</span>
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </label>
              <button type="button" onClick={handleRemovePhoto} className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-sm font-bold text-sm transition-colors">
                <FiTrash2 />
                <span>Quitar</span>
              </button>
            </div>
          </div>

          {/* Información Personal Box */}
          <div className="bg-[#162d47] p-6 rounded-sm shadow-lg text-white">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <FiUser className="text-[#2988c9]" />
              <span>Información Personal</span>
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Nombre</label>
                  <input type="text" name="Nombre" value={formData.Nombre} onChange={handleChange} className="w-full px-3 py-2 text-gray-900 bg-white rounded-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Apellido</label>
                  <input type="text" name="Apellido" value={formData.Apellido} onChange={handleChange} className="w-full px-3 py-2 text-gray-900 bg-white rounded-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Correo</label>
                  <input type="email" name="Correo" value={formData.Correo} onChange={handleChange} className="w-full px-3 py-2 text-gray-900 bg-white rounded-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Usuario</label>
                  <input type="text" name="Usuario" value={formData.Usuario} disabled className="w-full px-3 py-2 text-gray-600 bg-gray-200 rounded-sm outline-none cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Rol</label>
                <input type="text" name="Rol" value={formData.Rol} disabled className="w-full px-3 py-2 text-gray-600 bg-gray-200 rounded-sm outline-none cursor-not-allowed" />
              </div>
            </div>
          </div>

          {/* Seguridad Box */}
          <div className="bg-[#162d47] p-6 rounded-sm shadow-lg text-white">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <FiLock className="text-[#2988c9]" />
              <span>Seguridad y Contraseña</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Contraseña Actual</label>
                <input type="password" name="PasswordActual" value={formData.PasswordActual} onChange={handleChange} className="w-full px-3 py-2 text-gray-900 bg-white rounded-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nueva Contraseña</label>
                <input type="password" name="PasswordNueva" value={formData.PasswordNueva} onChange={handleChange} className="w-full px-3 py-2 text-gray-900 bg-white rounded-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Confirmar Nueva Contraseña</label>
                <input type="password" name="PasswordConfirma" value={formData.PasswordConfirma} onChange={handleChange} className="w-full px-3 py-2 text-gray-900 bg-white rounded-sm outline-none" />
              </div>
            </div>
          </div>

          {/* Telegram e Integración */}
          <div className="bg-brand-blue/5 border border-brand-blue/20 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-black text-brand-dark flex items-center gap-2">
                <FiMessageCircle className="text-brand-blue" /> Telegram
              </h4>
              <p className="text-sm text-gray-500 mt-1">Recibe notificaciones del sistema directamente en tu celular.</p>
              
              {!telegramChatId && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 text-xs text-gray-600">
                  <p className="font-bold mb-1">Para vincular tu cuenta:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Abre Telegram y busca el bot.</li>
                    <li>Envía el siguiente mensaje para registrarte:</li>
                  </ol>
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg font-mono text-brand-blue font-bold">
                    /registrar {user?.UsuarioLogin || user?.Usuario} [tu_contraseña]
                  </div>
                </div>
              )}
            </div>
            
            <div className="shrink-0 w-full md:w-auto">
              {telegramChatId ? (
                <button type="button" disabled className="w-full md:w-auto bg-emerald-100 text-emerald-700 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-2 border border-emerald-200 cursor-not-allowed">
                  <span>✅ Telegram vinculado</span>
                </button>
              ) : (
                <button type="button" onClick={handleTelegram} className="w-full md:w-auto btn-primary bg-[#0088cc] hover:bg-[#0077b3] shadow-[#0088cc]/20 text-white border-none py-2.5">
                  Abrir Telegram
                </button>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <button type="submit" className="w-full bg-[#2988c9] hover:bg-[#3498DB] text-white font-bold py-4 rounded-sm flex items-center justify-center space-x-2 shadow-lg transition-colors">
            <FiSave className="text-xl" />
            <span>Guardar Cambios</span>
          </button>

        </form>
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

export default Profile;
