import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import Header from '../components/Header';
import { FiPlus, FiFilter, FiSearch, FiDownload } from 'react-icons/fi';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const Incidencias = ({ filterTecnico = false }) => {
  const { user } = useAuth();
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estados, setEstados] = useState([]);
  
  // Filtros
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ordenFecha, setOrdenFecha] = useState('desc');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Actualiza cada 15s para sincronizar con el Bot
    return () => clearInterval(interval);
  }, [filterTecnico]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incRes, estRes] = await Promise.all([
        api.get('/incidencias'), // El backend real trae todo, filtramos en el cliente
        api.get('/estados')
      ]);
      setIncidencias(incRes.data);
      setEstados(estRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    }
    setLoading(false);
  };

  const getPriorityColor = (id) => {
    switch (id) {
      case 1: return 'bg-red-100 text-red-800 border-red-200'; // Alta
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200'; // Media
      default: return 'bg-green-100 text-green-800 border-green-200'; // Baja
    }
  };

  const getStatusColor = (id) => {
    switch (id) {
      case 1: return 'bg-orange-400 text-white'; // Pendiente (naranja)
      case 2: return 'bg-blue-400 text-white'; // En Proceso
      case 3: return 'bg-green-500 text-white'; // Resuelto
      case 4: return 'bg-gray-500 text-white'; // Cerrado
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusName = (id) => {
    const st = estados.find(e => e.IdEstado === id);
    return st ? st.NombreEstado : 'Desconocido';
  };

  let filteredIncidencias = incidencias.filter(i => {
    // 1. Búsqueda por texto
    const s = search.toLowerCase();
    const matchesSearch = !s || (
      (i.NumeroTicket && i.NumeroTicket.toLowerCase().includes(s)) ||
      (i.Empleado && i.Empleado.toLowerCase().includes(s)) ||
      (i.Descripcion && i.Descripcion.toLowerCase().includes(s))
    );

    // 2. Filtro de estado
    const matchesEstado = !estadoFiltro || i.IdEstado === parseInt(estadoFiltro);

    // 3. Filtros de rol de usuario o técnico
    const isTecnicoMatched = !filterTecnico || i.IdTecnicoAsignado === user.IdUsuario;
    const isUsuarioMatched = user?.Rol !== 'Usuario' || (i.Empleado || '').toLowerCase() === `${user.Nombre} ${user.Apellido}`.trim().toLowerCase();

    // 4. Filtro por Fechas
    const incDate = new Date(i.Fecha).getTime();
    const fromDate = fechaDesde ? new Date(fechaDesde).getTime() : 0;
    // Hasta se ajusta al final del día
    const toDate = fechaHasta ? new Date(fechaHasta).setHours(23, 59, 59, 999) : Infinity;
    const matchesDate = incDate >= fromDate && incDate <= toDate;

    return matchesSearch && matchesEstado && isTecnicoMatched && isUsuarioMatched && matchesDate;
  });

  // Ordenar
  filteredIncidencias.sort((a, b) => {
    const d1 = new Date(a.Fecha).getTime();
    const d2 = new Date(b.Fecha).getTime();
    return ordenFecha === 'desc' ? d2 - d1 : d1 - d2;
  });

  return (
    <div className="flex flex-col h-full relative pb-20 bg-brand-light">
      <Header />
      
      <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-2">
          <div>
            <h2 className="text-2xl font-black text-brand-dark tracking-tight">
              {filterTecnico ? 'Mis Tickets Asignados' : (user?.Rol === 'Usuario' ? 'Mis Reportes de Incidencias' : 'Gestión de Incidencias')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {filterTecnico ? 'Tickets que debes resolver' : 'Lista completa de requerimientos y reportes'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button onClick={() => exportToPDF(
                filteredIncidencias, 
                'Reporte de Incidencias', 
                `Reporte_Incidencias_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`
              )}
              className="bg-red-50 text-red-600 hover:bg-red-100 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a PDF">
              <FiDownload className="text-lg" />
            </button>
            <button onClick={() => exportToExcel(
                filteredIncidencias, 
                `Reporte_Incidencias_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`
              )}
              className="bg-green-50 text-green-600 hover:bg-green-100 p-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors" title="Exportar a Excel">
              <FiDownload className="text-lg" />
            </button>

            <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 focus-within:ring-2 ring-brand-blue transition-all">
              <FiFilter className="text-gray-400 ml-2" />
              <select 
                className="bg-transparent border-none text-sm outline-none py-1 pl-2 pr-4 text-gray-700 font-bold"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                {estados.map(e => (
                  <option key={e.IdEstado} value={e.IdEstado}>{e.NombreEstado}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-4 top-3.5 text-gray-400 text-xl" />
            <input 
              type="text" 
              placeholder="Buscar por ticket, empleado o descripción..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-modern pl-12 text-lg shadow-none border-gray-200 w-full"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Desde</label>
              <input 
                type="date" 
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Hasta</label>
              <input 
                type="date" 
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Ordenar por</label>
              <select 
                value={ordenFecha}
                onChange={(e) => setOrdenFecha(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 px-3 font-bold focus:ring-2 focus:ring-brand-blue outline-none"
              >
                <option value="desc">Más recientes primero</option>
                <option value="asc">Más antiguos primero</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 font-bold animate-pulse">Cargando incidencias...</div>
        ) : filteredIncidencias.length === 0 ? (
          <div className="card-modern p-12 text-center border-dashed border-2 border-gray-200 shadow-none">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiSearch className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-500 font-bold text-lg">No se encontraron incidencias.</p>
            <p className="text-gray-400 text-sm mt-1">Prueba cambiando los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIncidencias.map(inc => (
              <Link to={`/incidencia/${inc.IdIncidencia}`} key={inc.IdIncidencia} className="card-modern p-5 border-l-4 hover:shadow-lg transition-all hover:-translate-y-1 group" style={{ borderLeftColor: inc.IdPrioridad === 1 ? '#ef4444' : inc.IdPrioridad === 2 ? '#f59e0b' : '#3b82f6' }}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-black text-brand-dark group-hover:text-brand-blue transition-colors">{inc.NumeroTicket}</span>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{new Date(inc.Fecha).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-gray-800 mb-2 line-clamp-1">{inc.TipoIncidencia}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">{inc.Descripcion}</p>
                
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${getPriorityColor(inc.IdPrioridad)}`}>
                      {inc.IdPrioridad === 1 ? 'Alta' : inc.IdPrioridad === 2 ? 'Media' : 'Baja'}
                    </span>
                    {inc.vencida && (
                      <span className="text-[10px] font-bold px-2.5 py-1 bg-red-100 text-red-600 rounded-full flex items-center gap-1 uppercase tracking-wider">
                        <FiAlertCircle /> SLA Vencido
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wider border ${getStatusColor(inc.IdEstado)}`}>
                    {getStatusName(inc.IdEstado)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {(user?.Rol === 'Administrador' || user?.Rol === 'Usuario') && (
        <Link 
          to="/nueva" 
          className="fixed bottom-6 right-6 w-14 h-14 bg-brand-blue text-white rounded-full flex items-center justify-center shadow-lg hover:bg-brand-hover hover:scale-105 transition-all"
        >
          <FiPlus size={28} />
        </Link>
      )}
    </div>
  );
};

export default Incidencias;
