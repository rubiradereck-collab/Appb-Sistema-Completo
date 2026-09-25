import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#ef4444', '#eab308', '#22c55e', '#3b82f6']; // Colores por estado (Pendiente, Proceso, Resuelto, Cerrado)

const StatsWidget = ({ incidencias }) => {
  const data = useMemo(() => {
    if (!incidencias || incidencias.length === 0) return [];
    const counts = incidencias.reduce((acc, inc) => {
      acc[inc.IdEstado] = (acc[inc.IdEstado] || 0) + 1;
      return acc;
    }, {});
    
    return [
      { name: 'Pendientes', value: counts[1] || 0 },
      { name: 'En Proceso', value: counts[2] || 0 },
      { name: 'Resueltas', value: counts[3] || 0 },
      { name: 'Cerradas', value: counts[4] || 0 }
    ].filter(d => d.value > 0);
  }, [incidencias]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex items-center">
      <div className="flex-1">
        <h3 className="font-bold text-gray-800 text-lg mb-1">Resumen General</h3>
        <p className="text-sm text-gray-500 mb-4">Estado actual de los tickets</p>
        
        <div className="grid grid-cols-2 gap-2">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center text-sm font-medium">
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
              <span className="text-gray-600 mr-1">{entry.name}:</span>
              <span className="text-gray-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-32 h-32 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={30}
              outerRadius={50}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsWidget;
