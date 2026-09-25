import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { FiMenu, FiX, FiLogOut, FiHome, FiList, FiPlusCircle, FiUser, FiBook, FiUsers, FiLayers, FiActivity, FiBell } from 'react-icons/fi';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLink = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        onClick={() => setMenuOpen(false)}
        className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${
          isActive 
            ? 'bg-brand-blue/20 text-blue-300 border-l-4 border-brand-blue shadow-sm' 
            : 'text-gray-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
        }`}
      >
        <Icon className={`text-xl ${isActive ? 'text-brand-blue' : ''}`} />
        <span className="tracking-wide">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <header className="bg-brand-dark text-white p-3 md:p-4 flex justify-between items-center shadow-md sticky top-0 z-40 border-b border-white/5">
        <div className="flex items-center space-x-4">
          <button onClick={() => setMenuOpen(true)} className="p-2 focus:outline-none hover:bg-white/10 rounded-xl transition-colors">
            <FiMenu className="text-2xl" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/10 rounded-lg p-1 backdrop-blur-sm hidden sm:block">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:block">APPB</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-5">
          <button className="relative p-2 text-gray-300 hover:text-white transition-colors hidden sm:block">
            <FiBell className="text-xl" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center space-x-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 shadow-sm cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate('/perfil')}>
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold leading-tight">{user?.Nombre} {user?.Apellido}</p>
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">{user?.Rol}</p>
            </div>
            <div className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center font-bold shadow-inner overflow-hidden border-2 border-white/20">
              {user?.FotoPerfil ? (
                <img src={user.FotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.Nombre?.charAt(0) || 'U'}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Menú Lateral (Drawer) */}
      <div className={`fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)}>
        <div 
          className={`fixed top-0 left-0 w-72 h-full bg-brand-dark shadow-2xl flex flex-col transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) border-r border-white/10 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Menu Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
            <div className="flex items-center space-x-3">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden p-1.5">
                 <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
               </div>
               <div>
                  <h2 className="font-black text-xl text-white tracking-tight">APPB</h2>
                  <p className="text-[10px] text-brand-blue font-bold uppercase tracking-widest">Portal Web</p>
               </div>
            </div>
            <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-white p-2 bg-white/5 rounded-lg transition-colors">
              <FiX className="text-xl" />
            </button>
          </div>

          {/* Menu Links */}
          <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
            <nav className="px-3 space-y-1">
              
              <NavLink to="/incidencias" icon={FiList} label="Incidencias" />
              
              {user?.Rol === 'Técnico' && (
                <NavLink to="/mis-tickets" icon={FiList} label="Mis Tickets" />
              )}

              {(user?.Rol === 'Administrador' || user?.Rol === 'Usuario') && (
                <NavLink to="/nueva" icon={FiPlusCircle} label="Nueva Incidencia" />
              )}
              
              <NavLink to="/guias" icon={FiBook} label="Guías Rápidas" />

              {user?.Rol === 'Administrador' && (
                <>
                  <div className="mt-8 mb-3 px-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Administración</p>
                  </div>
                  <NavLink to="/dashboard" icon={FiActivity} label="Dashboard" />
                  <NavLink to="/usuarios" icon={FiUsers} label="Usuarios" />
                  <NavLink to="/areas" icon={FiLayers} label="Áreas" />
                  <NavLink to="/auditoria" icon={FiActivity} label="Auditoría" />
                </>
              )}
            </nav>
          </div>

          {/* Menu Footer */}
          <div className="p-4 border-t border-white/10 bg-black/20 mt-auto">
            <Link to="/perfil" onClick={() => setMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors mb-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-blue border border-white/20">
                {user?.FotoPerfil ? (
                  <img src={user.FotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {user?.Nombre?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{user?.Usuario}</p>
                <p className="text-xs text-gray-400">Ver Perfil</p>
              </div>
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-500/10 text-red-400 font-bold py-3 px-4 rounded-xl hover:bg-red-500 hover:text-white transition-all"
            >
              <FiLogOut className="text-lg" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
