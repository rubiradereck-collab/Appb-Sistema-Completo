import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { FiHome, FiList, FiPlusCircle, FiBook, FiSettings } from 'react-icons/fi';

const BottomNav = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  const NavItem = ({ to, icon: Icon, label, isCenter }) => {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
            isCenter
              ? 'relative -top-5 bg-brand-blue text-white rounded-full w-14 h-14 shadow-lg shadow-blue-500/30'
              : isActive
              ? 'text-brand-blue dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`
        }
      >
        <Icon size={isCenter ? 28 : 20} />
        {!isCenter && <span className="text-[10px] font-medium truncate w-full text-center">{label}</span>}
      </NavLink>
    );
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 px-2">
        {(user.Rol === 'Administrador' || user.Rol === 'Técnico') && (
          <NavItem to="/" icon={FiHome} label="Inicio" />
        )}
        
        {user.Rol === 'Técnico' && (
          <NavItem to="/mis-tickets" icon={FiList} label="Mis Tickets" />
        )}
        
        <NavItem to="/incidencias" icon={FiList} label="Incidencias" />
        
        {(user.Rol === 'Administrador' || user.Rol === 'Usuario') && (
          <div className="flex-1 flex justify-center">
            <NavItem to="/nueva" icon={FiPlusCircle} label="Nueva" isCenter={true} />
          </div>
        )}
        
        <NavItem to="/guias" icon={FiBook} label="Guías" />
        <NavItem to="/configuracion" icon={FiSettings} label="Ajustes" />
      </div>
    </div>
  );
};

export default BottomNav;
