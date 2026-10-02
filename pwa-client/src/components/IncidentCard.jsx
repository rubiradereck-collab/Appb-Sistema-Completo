import React from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiUser, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'hace un momento';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `hace ${diffInMinutes} m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'ayer';
  if (diffInDays < 7) return `hace ${diffInDays} d`;
  return date.toLocaleDateString();
};

export const StatusChip = ({ status, idEstado }) => {
  // 1: Abierto (Rojo), 2: En Proceso (Azul), 3: Resuelto (Amarillo), 4: Cerrado (Verde)
  let bg = 'bg-gray-100 dark:bg-gray-700';
  let text = 'text-gray-700 dark:text-gray-300';
  let Icon = FiClock;

  if (idEstado === 1 || status === 'Abierto') {
    bg = 'bg-red-100 dark:bg-red-900/30'; text = 'text-red-700 dark:text-red-400'; Icon = FiAlertCircle;
  } else if (idEstado === 2 || status === 'En Proceso') {
    bg = 'bg-blue-100 dark:bg-blue-900/30'; text = 'text-blue-700 dark:text-blue-400';
  } else if (idEstado === 3 || status === 'Resuelto') {
    bg = 'bg-yellow-100 dark:bg-yellow-900/30'; text = 'text-yellow-700 dark:text-yellow-400'; Icon = FiCheckCircle;
  } else if (idEstado === 4 || status === 'Cerrado') {
    bg = 'bg-green-100 dark:bg-green-900/30'; text = 'text-green-700 dark:text-green-400'; Icon = FiCheckCircle;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${bg} ${text}`}>
      <Icon className="mr-1" size={10} /> {status}
    </span>
  );
};

export const PriorityChip = ({ priority, idPrioridad }) => {
  // 1: Alta, 2: Media, 3: Baja
  let bg = 'bg-gray-100 dark:bg-gray-700';
  let text = 'text-gray-700 dark:text-gray-300';

  if (idPrioridad === 1 || priority === 'Alta') {
    bg = 'bg-orange-100 dark:bg-orange-900/30'; text = 'text-orange-700 dark:text-orange-400';
  } else if (idPrioridad === 2 || priority === 'Media') {
    bg = 'bg-purple-100 dark:bg-purple-900/30'; text = 'text-purple-700 dark:text-purple-400';
  } else if (idPrioridad === 3 || priority === 'Baja') {
    bg = 'bg-teal-100 dark:bg-teal-900/30'; text = 'text-teal-700 dark:text-teal-400';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${bg} ${text}`}>
      {priority}
    </span>
  );
};

export const IncidentCard = ({ incidencia }) => {
  return (
    <Link to={`/incidencia/${incidencia.NumeroTicket}`} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all p-4 relative">
        
        {incidencia.EscaladoSLA && (
          <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl flex items-center shadow-sm">
            <FiAlertCircle size={8} className="mr-1" />
            SLA VENCIDO
          </div>
        )}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">#{incidencia.IdIncidencia}</span>
            <StatusChip status={incidencia.NombreEstado} idEstado={incidencia.IdEstado} />
            <PriorityChip priority={incidencia.NombrePrioridad} idPrioridad={incidencia.IdPrioridad} />
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{timeAgo(incidencia.Fecha)}</span>
        </div>
        
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{incidencia.TipoIncidencia}</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{incidencia.Descripcion}</p>
        
        <div className="flex justify-between items-center text-[11px] font-medium text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-3">
            <span>{incidencia.Empleado} • {incidencia.NombreArea}</span>
            {incidencia.NombreTecnicoAsignado && (
              <span className="flex items-center text-brand-blue dark:text-blue-400 bg-brand-light dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                <FiUser size={10} className="mr-1" />
                {incidencia.NombreTecnicoAsignado.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
