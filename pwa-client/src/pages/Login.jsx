import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { FiUser, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    if (success) navigate('/');
    else setErrorMsg('Credenciales incorrectas');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Lado Izquierdo: Branding (Oculto en móviles) */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-dark flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #2988c9 0%, transparent 40%), radial-gradient(circle at 80% 70%, #2988c9 0%, transparent 40%)' }}></div>
        
        <div className="w-64 h-64 mb-8 relative z-10">
          <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl"></div>
          <img src="/logo.png" alt="APPB Logo" className="w-full h-full object-contain drop-shadow-2xl relative z-10" />
        </div>
        
        <div className="text-center z-10 relative">
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">APPB</h1>
          <h2 className="text-xl text-blue-200 font-semibold tracking-wide mb-6">SISTEMA DE GESTIÓN DE INCIDENCIAS</h2>
          <div className="h-1 w-16 bg-brand-blue mx-auto rounded-full mb-6"></div>
          <p className="text-gray-400 max-w-md mx-auto text-sm">
            Plataforma centralizada para el reporte, seguimiento y solución de incidencias tecnológicas. Fortalecimiento Digital 2027.
          </p>
        </div>
      </div>

      {/* Lado Derecho: Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-brand-light relative">
        <div className="w-full max-w-md">
          
          {/* Logo visible solo en móviles */}
          <div className="lg:hidden mb-10 flex flex-col items-center">
            <div className="w-24 h-24 mb-4">
              <img src="/logo.png" alt="APPB Logo" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-black text-brand-dark tracking-tight">APPB</h1>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Bienvenido de nuevo!</h3>
            <p className="text-gray-500 mb-8 text-sm">Por favor, ingresa tus credenciales para acceder al panel.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2 ml-1">Usuario</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400 text-lg" />
                  </div>
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all text-gray-800"
                    placeholder="Escribe tu usuario"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2 ml-1">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400 text-lg" />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all text-gray-800"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-blue transition-colors"
                  >
                    {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 px-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                  <span className="text-sm text-gray-600">Recordarme</span>
                </label>
                <a href="#" className="text-sm font-bold text-brand-blue hover:text-brand-hover transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 border border-red-100 text-sm py-3 px-4 rounded-xl flex items-center space-x-2 animate-pulse">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-brand-dark hover:bg-brand-hover text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg mt-6 flex justify-center items-center active:scale-[0.98]"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'INGRESAR AL SISTEMA'}
              </button>
            </form>
          </div>
          
          <p className="text-center text-gray-400 text-xs mt-8">
            &copy; {new Date().getFullYear()} APPB - Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
