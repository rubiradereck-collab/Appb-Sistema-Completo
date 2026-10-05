import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useAuth } from '../AuthContext';
import api from '../api';
import Header from '../components/Header';

import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FiRefreshCw, FiList, FiClock, FiCheckSquare, FiAlertCircle, FiDownload, FiMail, FiX, FiUsers } from 'react-icons/fi';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';




const Dashboard = () => {
  const { user } = useAuth();
  const { isDarkMode, autoRefresh, refreshInterval } = useSettings();
  const [incidencias, setIncidencias] = useState([]);
  const [estados, setEstados] = useState([]);
  const [areas, setAreas] = useState([]);
  const [adopcion, setAdopcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal] = useState({ show: false, email: '' });
  const [periodo, setPeriodo] = useState('Todo el histórico');
  const [activeTab, setActiveTab] = useState('estado');

  useEffect(() => {
    fetchData();
  }, [periodo]);

  useAutoRefresh(() => fetchData(true), autoRefresh ? refreshInterval : null);

  const fetchData = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoading(true);
    try {
      const [incRes, estRes, areaRes] = await Promise.all([
        api.get('/incidencias', isAutoRefresh ? { silent: true } : {}),
        api.get('/estados', isAutoRefresh ? { silent: true } : {}),
        api.get('/areas', isAutoRefresh ? { silent: true } : {})
      ]);
      setIncidencias(incRes.data);
      setEstados(estRes.data);
      setAreas(areaRes.data);
      // La adopción va aparte: si falla, el resto del Dashboard sigue funcionando
      api.get('/adopcion', { silent: true })
        .then(r => setAdopcion(r.data.adopcionPorcentaje))
        .catch(() => setAdopcion(null));
    } catch (error) {
      console.error('Error fetching data', error);
    }
    if (!isAutoRefresh) setLoading(false);
  };

  // Cálculos de tarjetas
  const total = incidencias.length;
  const pendientes = incidencias.filter(i => i.IdEstado === 1).length;
  const resueltos = incidencias.filter(i => i.IdEstado === 3).length;
  const cerrados = incidencias.filter(i => i.IdEstado === 4).length;
  
  // Tiempo promedio real de atención (desde la creación hasta la solución)
  const resueltasConFecha = incidencias.filter(i => i.FechaSolucion && i.Fecha);
  const horasPromedio = resueltasConFecha.length
    ? resueltasConFecha.reduce((acc, i) => acc + (new Date(i.FechaSolucion) - new Date(i.Fecha)) / 3600000, 0) / resueltasConFecha.length
    : null;
  const tiempoPromedio = horasPromedio === null ? '—'
    : horasPromedio < 24 ? `${horasPromedio.toFixed(1)} h` : `${(horasPromedio / 24).toFixed(1)} d`;

  // Datos Gráfico Estado
  const dataEstado = estados.map(est => ({
    name: est.NombreEstado,
    value: incidencias.filter(i => i.IdEstado === est.IdEstado).length,
    color: est.IdEstado === 1 ? '#f59e0b' : est.IdEstado === 2 ? '#3b82f6' : est.IdEstado === 3 ? '#10b981' : '#6b7280'
  })).filter(d => d.value > 0);

  // Datos Gráfico Prioridad
  const dataPrioridad = [
    { name: 'Alta', value: incidencias.filter(i => i.IdPrioridad === 1).length, color: '#ef4444' },
    { name: 'Media', value: incidencias.filter(i => i.IdPrioridad === 2).length, color: '#f59e0b' },
    { name: 'Baja', value: incidencias.filter(i => i.IdPrioridad === 3).length, color: '#10b981' }
  ].filter(d => d.value > 0);

  // Datos Gráfico Área
  const dataArea = areas.map(a => ({
    name: a.NombreArea,
    value: incidencias.filter(i => i.IdArea === a.IdArea).length,
    color: '#' + Math.floor(Math.random()*16777215).toString(16) // Colores aleatorios para áreas o fijos si prefieres
  })).filter(d => d.value > 0);
  
  // Asignar colores fijos a las áreas por si acaso
  const areaColors = ['#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];
  dataArea.forEach((d, i) => d.color = areaColors[i % areaColors.length]);

  // Datos Gráfico Tendencia (Agrupado por Fecha)
  const fechasCount = {};
  incidencias.forEach(i => {
    const d = new Date(i.Fecha).toLocaleDateString();
    fechasCount[d] = (fechasCount[d] || 0) + 1;
  });
  const dataTendencia = Object.keys(fechasCount).map(k => ({ fecha: k, tickets: fechasCount[k] }));

  // Handlers para los botones de exportación (Placeholders)
  const handleExportPDF = async () => {
    if (!incidencias || incidencias.length === 0) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'No hay datos para exportar'}));
      return;
    }
    try {
      await exportToPDF(incidencias, 'Reporte de Incidencias', `Reporte_Incidencias_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al exportar reporte PDF'}));
    }
  };

  const handleOpenEmailModal = () => {
    if (!incidencias || incidencias.length === 0) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'No hay datos para exportar'}));
      return;
    }
    setEmailModal({ show: true, email: user?.Correo || '' });
  };

  const executeSendReport = async () => {
    if (!emailModal.email) return;
    
    setEmailModal({ show: false, email: '' });

    try {
      const filename = `Reporte_Incidencias_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`;
      const base64Pdf = await exportToPDF(incidencias, 'Reporte Mensual de Incidencias', filename, true);
      
      const res = await api.post('/reportes/enviar', {
        pdfBase64: base64Pdf,
        filename: filename,
        email: emailModal.email
      });
      window.dispatchEvent(new CustomEvent('app-success', {detail: res.data.message || 'Reporte enviado con éxito'}));
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al generar o enviar reporte mensual';
      window.dispatchEvent(new CustomEvent('app-error', {detail: errorMsg}));
    }
  };

  const handleExportExcel = async () => {
    if (!incidencias || incidencias.length === 0) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'No hay datos para exportar'}));
      return;
    }
    
    try {
      await exportToExcel(incidencias, `Reporte_Incidencias_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`);
      
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error al generar Excel';
      window.dispatchEvent(new CustomEvent('app-error', {detail: errorMsg}));
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-light pb-20 overflow-x-hidden">
      <Header />
      
      {emailModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="bg-brand-dark p-5 text-white font-bold flex justify-between items-center">
              <span className="flex items-center space-x-2"><FiMail className="text-xl" /><span>Enviar Reporte Mensual</span></span>
              <button onClick={() => setEmailModal({ show: false, email: '' })} className="text-gray-400 hover:text-white transition-colors bg-white dark:bg-gray-800/10 p-1.5 rounded-lg"><FiX /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">Correo de Destino</label>
              <input 
                type="email" 
                value={emailModal.email} 
                onChange={(e) => setEmailModal({ ...emailModal, email: e.target.value })} 
                className="input-modern mb-6 text-center text-lg" 
                placeholder="ejemplo@correo.com"
              />
              <div className="flex space-x-3">
                <button onClick={() => setEmailModal({ show: false, email: '' })} className="flex-1 btn-secondary">Cancelar</button>
                <button onClick={executeSendReport} className="flex-1 btn-primary">Enviar PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto w-full">
        
        {/* Controles Superiores */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-brand-dark tracking-tight">Dashboard General</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Métricas y resumen del sistema</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl py-2.5 px-4 shadow-sm outline-none focus:ring-2 focus:ring-brand-blue font-medium"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
            >
              <option>Todo el histórico</option>
              <option>Este Mes</option>
              <option>Esta Semana</option>
              <option>Hoy</option>
              <option>Personalizado...</option>
            </select>

            <button onClick={handleExportPDF} className="bg-red-50 text-red-600 hover:bg-red-100 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a PDF">
              <FiDownload className="text-lg" />
            </button>
            <button onClick={handleExportExcel} className="bg-green-50 text-green-600 hover:bg-green-100 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a Excel">
              <FiDownload className="text-lg" />
            </button>
            {user?.Rol === 'Administrador' && (
              <button onClick={handleOpenEmailModal} className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-sm transition-colors" title="Forzar envío de reporte mensual">
                <FiMail className="text-lg" />
                <span className="hidden md:inline">Enviar Reporte</span>
              </button>
            )}
            <button onClick={() => fetchData(false)} className="btn-primary py-2.5 px-4">
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          </div>
        </div>

        {/* Tarjetas Superiores */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="card-modern p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-blue/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</span>
                <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue"><FiList className="text-lg" /></div>
              </div>
              <span className="text-4xl font-black text-brand-dark">{total}</span>
            </div>
          </div>
          
          <div className="card-modern p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pendientes</span>
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><FiAlertCircle className="text-lg" /></div>
              </div>
              <span className="text-4xl font-black text-amber-500">{pendientes}</span>
            </div>
          </div>
          
          <div className="card-modern p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resueltos</span>
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><FiCheckSquare className="text-lg" /></div>
              </div>
              <span className="text-4xl font-black text-emerald-500">{resueltos}</span>
            </div>
          </div>
          
          <div className="card-modern p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tiempo Promedio</span>
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><FiClock className="text-lg" /></div>
              </div>
              <span className="text-4xl font-black text-indigo-500">{tiempoPromedio}</span>
            </div>
          </div>

          <div className="card-modern p-5 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out ${adopcion !== null && adopcion >= 80 ? 'bg-emerald-500/5' : 'bg-orange-500/5'}`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Adopción</span>
                <div className={`p-2 rounded-lg ${adopcion !== null && adopcion >= 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}><FiUsers className="text-lg" /></div>
              </div>
              <span className={`text-4xl font-black ${adopcion === null ? 'text-gray-400' : adopcion >= 80 ? 'text-emerald-500' : 'text-orange-500'}`}>
                {adopcion === null ? '—' : `${Math.round(adopcion)}%`}
              </span>
              <p className="text-xs text-gray-400 mt-1">Meta: 80% del personal</p>
            </div>
          </div>
        </div>

        {/* Pestañas y Gráfico */}
        <div className="card-modern mb-8">
          <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto hide-scrollbar bg-gray-50 dark:bg-gray-900/50">
            {['estado', 'prioridad', 'area', 'tendencia'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab 
                    ? 'border-brand-blue text-brand-blue bg-white dark:bg-gray-800' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700'
                }`}
              >
                {tab === 'estado' && 'Por Estado'}
                {tab === 'prioridad' && 'Nivel de Prioridad'}
                {tab === 'area' && 'Por Área'}
                {tab === 'tendencia' && 'Tendencia'}
              </button>
            ))}
          </div>
          
          <div className="p-6 h-[400px]">
            <h3 className="font-bold text-brand-dark mb-6 text-base tracking-wide flex items-center space-x-2">
              <span className="w-1.5 h-6 bg-brand-blue rounded-full"></span>
              <span>
                {activeTab === 'estado' && 'Distribución de Tickets por Estado'}
                {activeTab === 'prioridad' && 'Nivel de Prioridad General'}
                {activeTab === 'area' && 'Incidencias Reportadas por Área'}
                {activeTab === 'tendencia' && 'Línea de Tiempo de Reportes'}
              </span>
            </h3>
            
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 font-bold animate-pulse">Cargando gráfico...</div>
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                {activeTab === 'tendencia' ? (
                  <LineChart data={dataTendencia} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDarkMode ? '#d1d5db' : '#4b5563' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000' }} />
                  <Line type="monotone" dataKey="tickets" stroke="#2988c9" strokeWidth={3} dot={{ r: 4, fill: "#2988c9", strokeWidth: 2, stroke: isDarkMode ? "#1f2937" : "#fff" }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <PieChart>
                  <Pie
                    data={activeTab === 'estado' ? dataEstado : activeTab === 'prioridad' ? dataPrioridad : dataArea}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {(activeTab === 'estado' ? dataEstado : activeTab === 'prioridad' ? dataPrioridad : dataArea).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: isDarkMode ? '#d1d5db' : '#4b5563' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
