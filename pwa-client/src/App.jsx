import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { FiAlertCircle } from 'react-icons/fi';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Incidencias from './pages/Incidencias';
import IncidentDetail from './pages/IncidentDetail';
import NewIncident from './pages/NewIncident';
import Profile from './pages/Profile';
import Guias from './pages/Guias';
import Usuarios from './pages/Usuarios';
import Areas from './pages/Areas';
import Auditoria from './pages/Auditoria';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.Rol)) return <Navigate to="/incidencias" replace />;
  
  return children;
};

const ToastMessage = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleAppError = (e) => {
      setToast({ message: e.detail, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    };
    const handleAppSuccess = (e) => {
      setToast({ message: e.detail, type: 'success' });
      setTimeout(() => setToast(null), 4000);
    };
    window.addEventListener('app-error', handleAppError);
    window.addEventListener('app-success', handleAppSuccess);
    return () => {
      window.removeEventListener('app-error', handleAppError);
      window.removeEventListener('app-success', handleAppSuccess);
    };
  }, []);

  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] text-white px-4 py-3 rounded-md shadow-2xl flex items-center gap-2 max-w-sm w-[90%] ${isErr ? 'bg-red-600' : 'bg-green-600'}`}>
      <FiAlertCircle className="text-xl flex-shrink-0" />
      <span className="font-medium text-sm">{toast.message}</span>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastMessage />
        <Routes>
          <Route path="/" element={<Navigate to="/incidencias" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Dashboard: Solo Admin y Técnico (Usuarios regulares van directo a sus tickets) */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Administrador', 'Técnico']}><Dashboard /></ProtectedRoute>} />
          
          {/* Incidencias (Todos) */}
          <Route path="/incidencias" element={<ProtectedRoute><Incidencias /></ProtectedRoute>} />
          
          {/* Mis Tickets (Solo Técnicos) */}
          <Route path="/mis-tickets" element={<ProtectedRoute allowedRoles={['Técnico']}><Incidencias filterTecnico={true} /></ProtectedRoute>} />
          
          {/* Detalle, Perfil y Guías (Todos) */}
          <Route path="/incidencia/:id" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/guias" element={<ProtectedRoute><Guias /></ProtectedRoute>} />
          
          {/* Nueva (Solo Admin y Usuarios) */}
          <Route path="/nueva" element={<ProtectedRoute allowedRoles={['Administrador', 'Usuario']}><NewIncident /></ProtectedRoute>} />
          
          {/* Administración (Solo Admin) */}
          <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['Administrador']}><Usuarios /></ProtectedRoute>} />
          <Route path="/areas" element={<ProtectedRoute allowedRoles={['Administrador']}><Areas /></ProtectedRoute>} />
          <Route path="/auditoria" element={<ProtectedRoute allowedRoles={['Administrador']}><Auditoria /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
