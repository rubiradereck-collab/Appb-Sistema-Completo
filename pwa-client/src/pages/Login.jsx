import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { FiUser, FiLock, FiEye, FiEyeOff, FiX, FiMail, FiLoader } from 'react-icons/fi';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ text: "", type: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const result = await login(username, password);
    setLoading(false);
    
    if (result.success) {
      navigate('/');
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMsg({ text: "", type: "" });
    try {
      const res = await api.post("/auth/recuperar-password", { Correo: forgotEmail });
      setForgotMsg({ text: res.data.message || "Se han enviado las instrucciones.", type: "success" });
    } catch (err) {
      setForgotMsg({ text: err.response?.data?.message || "No se pudo enviar el correo o no existe.", type: "error" });
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#162d47] to-[#0f1f33] p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="APPB Logo" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Bienvenido</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center">
              {errorMsg}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiUser className="text-gray-400" size={20} />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white dark:focus:bg-gray-800 transition-all"
                placeholder="Nombre de usuario"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiLock className="text-gray-400" size={20} />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white dark:focus:bg-gray-800 transition-all"
                placeholder="Contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowForgotModal(true)} className="text-sm text-brand-blue dark:text-blue-400 font-medium hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 flex justify-center items-center rounded-xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <><FiLoader className="animate-spin mr-2" /> Iniciando sesión...</> : 'Ingresar'}
          </button>
        </form>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative animate-fadeIn">
            <button onClick={() => setShowForgotModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <FiX className="text-2xl" />
            </button>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Recuperar Contraseña</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Ingresa tu correo electrónico registrado y te enviaremos una clave temporal.</p>
            
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400 text-lg" />
                  </div>
                  <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                    placeholder="tu.correo@appb.gob.ec" />
                </div>
              </div>
              
              {forgotMsg.text && (
                <div className={`text-sm py-3 px-4 rounded-xl flex items-center ${forgotMsg.type === "success" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
                  <span>{forgotMsg.text}</span>
                </div>
              )}
              
              <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-3 flex justify-center items-center rounded-xl">
                {forgotLoading ? <><FiLoader className="animate-spin mr-2" /> Enviando...</> : 'Enviar Instrucciones'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
