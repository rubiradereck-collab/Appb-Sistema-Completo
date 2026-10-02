import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useAuth } from '../AuthContext';
import api from '../api';
import Header from '../components/Header';
import { IncidentCard } from '../components/IncidentCard';
import { CardSkeleton, EmptyState } from '../components/Skeletons';
import { FiFilter, FiSearch, FiDownload, FiCheck, FiX, FiInbox, FiChevronDown, FiFileText, FiGrid } from 'react-icons/fi';
import { exportGenericExcel, exportGenericPDF } from '../utils/exportUtils';

const Incidencias = ({ filterTecnico = false }) => {
  const { user } = useAuth();
  const { autoRefresh, refreshInterval } = useSettings();
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estados, setEstados] = useState([]);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ordenFecha, setOrdenFecha] = useState('desc');

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterTecnico]);

  useAutoRefresh(() => fetchData(true), autoRefresh ? refreshInterval : null);

  const fetchData = async (isAutoRefresh = false) => {
    if (!isAutoRefresh && incidencias.length === 0) setLoading(true);
    try {
      const [incRes, estRes] = await Promise.all([
        api.get('/incidencias', isAutoRefresh ? { silent: true } : {}),
        api.get('/estados', isAutoRefresh ? { silent: true } : {})
      ]);
      setIncidencias(incRes.data);
      setEstados(estRes.data);
    } catch (error) {
      if (!isAutoRefresh) window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al cargar incidencias'}));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Pull to refresh logic for mobile (simple native scroll detection or just use standard touch events)
  // Capacitor handles native pull to refresh if configured, or we can build a simple one. 
  // Given time constraints, a simple reload button/indicator at top or native pull is best.

  const incidenciasFiltradas = incidencias
    .filter(i => filterTecnico ? i.IdTecnico === user.IdUsuario : true)
    .filter(i => i.Asunto.toLowerCase().includes(busqueda.toLowerCase()) || i.IdIncidencia.toString().includes(busqueda))
    .filter(i => filtroEstado === '' || i.IdEstado.toString() === filtroEstado)
    .filter(i => {
      if (!fechaDesde && !fechaHasta) return true;
      const f = new Date(i.FechaCreacion).getTime();
      const d = fechaDesde ? new Date(fechaDesde).getTime() : 0;
      const h = fechaHasta ? new Date(fechaHasta).getTime() + 86400000 : Infinity;
      return f >= d && f <= h;
    })
    .sort((a, b) => {
      const da = new Date(a.FechaCreacion).getTime();
      const db = new Date(b.FechaCreacion).getTime();
      return ordenFecha === 'asc' ? da - db : db - da;
    });

  const activeFiltersCount = (filtroEstado !== '' ? 1 : 0) + (fechaDesde !== '' ? 1 : 0) + (fechaHasta !== '' ? 1 : 0);

  const handleExportPDF = async () => {
    setShowExport(false);
    if (incidenciasFiltradas.length === 0) return window.dispatchEvent(new CustomEvent('app-error', {detail: 'No hay datos'}));
    try {
      await exportGenericPDF(incidenciasFiltradas, 'Reporte de Incidencias', `Incidencias_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(err) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: err.message || 'Error al exportar'}));
    }
  };

  const handleExportExcel = async () => {
    setShowExport(false);
    if (incidenciasFiltradas.length === 0) return window.dispatchEvent(new CustomEvent('app-error', {detail: 'No hay datos'}));
    try {
      await exportGenericExcel(incidenciasFiltradas, `Incidencias_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch(err) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: err.message || 'Error al exportar'}));
    }
  };

  const clearFilters = () => {
    setFiltroEstado(''); setFechaDesde(''); setFechaHasta(''); setOrdenFecha('desc'); setBusqueda(''); setShowFilters(false);
  };

  return (
    <div className="min-h-screen bg-brand-light dark:bg-gray-900 pb-20">
      <Header title={filterTecnico ? "Mis Tickets" : "Incidencias"} />

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Top Bar: Search and Buttons */}
        <div className="flex space-x-2 mb-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar ticket..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none dark:text-white"
            />
          </div>
          
          <button onClick={() => setShowFilters(true)} className="relative flex items-center justify-center p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 active:scale-95 transition-all">
            <FiFilter size={18} />
            {activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 bg-brand-blue text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFiltersCount}</span>}
          </button>

          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="flex items-center justify-center p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 active:scale-95 transition-all">
              <FiDownload size={18} />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
                <button onClick={handleExportPDF} className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"><FiFileText className="mr-2 text-red-500" /> PDF</button>
                <button onClick={handleExportExcel} className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><FiGrid className="mr-2 text-green-500" /> Excel</button>
              </div>
            )}
          </div>
        </div>

        {/* Pull to refresh native indicator / Button */}
        {refreshing && (
          <div className="flex justify-center py-2 mb-2">
            <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3" onTouchStart={(e) => {
          // Simplest pull to refresh trigger without complex library
          if (window.scrollY === 0) window.pullStartY = e.touches[0].clientY;
        }} onTouchEnd={(e) => {
          if (window.scrollY === 0 && window.pullStartY && (e.changedTouches[0].clientY - window.pullStartY > 80)) {
            handleRefresh();
          }
          window.pullStartY = null;
        }}>
          {loading ? (
            Array(5).fill(0).map((_, i) => <CardSkeleton key={i} />)
          ) : incidenciasFiltradas.length > 0 ? (
            incidenciasFiltradas.map(incidencia => (
              <IncidentCard key={incidencia.IdIncidencia} incidencia={incidencia} />
            ))
          ) : (
            <EmptyState 
              title={activeFiltersCount > 0 || busqueda ? "Ninguna incidencia coincide" : "No hay incidencias pendientes 🎉"} 
              description={activeFiltersCount > 0 || busqueda ? "Intenta ajustar los filtros o la búsqueda." : "¡Todo está al día!"}
              icon={FiInbox}
              action={activeFiltersCount > 0 || busqueda ? { label: 'Limpiar filtros', onClick: clearFilters } : null}
            />
          )}
        </div>
      </div>

      {/* Bottom Sheet Filters */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilters(false)}></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl p-6 pb-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filtros</h3>
              <button onClick={() => setShowFilters(false)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full"><FiX /></button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Estado</label>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none dark:text-white">
                  <option value="">Todos los estados</option>
                  {estados.map(e => <option key={e.IdEstado} value={e.IdEstado}>{e.Nombre}</option>)}
                </select>
              </div>
              <div className="flex space-x-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Desde</label>
                  <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Hasta</label>
                  <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Orden</label>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <button onClick={() => setOrdenFecha('desc')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${ordenFecha === 'desc' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Más recientes</button>
                  <button onClick={() => setOrdenFecha('asc')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${ordenFecha === 'asc' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Más antiguas</button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button onClick={clearFilters} className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">Limpiar</button>
              <button onClick={() => setShowFilters(false)} className="flex-1 py-3.5 bg-brand-blue text-white font-bold rounded-xl transition-colors hover:bg-blue-600 shadow-lg shadow-blue-500/30">Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidencias;
