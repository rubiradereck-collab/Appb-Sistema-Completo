import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import Header from '../components/Header';
import { FiArrowLeft, FiSave, FiCheckCircle } from 'react-icons/fi';

const NewIncident = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  
  const [formData, setFormData] = useState({
    Empleado: user?.Nombre + ' ' + user?.Apellido,
    IdArea: '',
    TipoIncidencia: '',
    Descripcion: '',
    IdPrioridad: ''
  });

  useEffect(() => {
    // Cargar catálogos
    const fetchData = async () => {
      try {
        const [arRes, prRes] = await Promise.all([
          api.get('/areas'),
          api.get('/prioridades')
        ]);
        setAreas(arRes.data);
        setPrioridades(prRes.data);
        if (arRes.data.length > 0) setFormData(f => ({ ...f, IdArea: arRes.data[0].IdArea }));
        if (prRes.data.length > 0) setFormData(f => ({ ...f, IdPrioridad: prRes.data[0].IdPrioridad }));
      } catch (error) {
        console.error('Error cargando catálogos', error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.Descripcion.trim().length < 10) {
      return;
    }
    setGuardando(true);
    try {
      await api.post('/incidencias', formData);
      window.dispatchEvent(new CustomEvent('app-success', {detail: 'Incidencia creada con éxito'}));
      setSuccessMsg(true);
      setTimeout(() => {
        navigate('/incidencias');
      }, 1500);
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al crear la incidencia'}));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-10">
      <Header />
      <main className="p-4 max-w-3xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="flex items-center text-blue-600 mb-4 py-2 font-medium">
          <FiArrowLeft className="mr-2" /> Volver
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Reportar Nueva Incidencia</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
              <select 
                name="IdArea"
                value={formData.IdArea}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione un área</option>
                {areas.map(a => (
                  <option key={a.IdArea} value={a.IdArea}>{a.NombreArea}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Reportante (Empleado)</label>
              <input 
                type="text"
                name="Empleado"
                value={formData.Empleado}
                onChange={handleChange}
                maxLength={150}
                required
                className="w-full px-4 py-3 bg-white rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formData.Empleado.length >= 150 && <p className="text-xs text-red-500 mt-1">Límite de 150 caracteres alcanzado.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Problema</label>
              <input 
                type="text"
                name="TipoIncidencia"
                value={formData.TipoIncidencia}
                onChange={handleChange}
                maxLength={100}
                placeholder="Ej. Problema de red, Software no abre..."
                required
                className="w-full px-4 py-3 bg-white rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formData.TipoIncidencia.length >= 100 && <p className="text-xs text-red-500 mt-1">Límite de 100 caracteres alcanzado.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Detallada</label>
              <textarea 
                name="Descripcion"
                value={formData.Descripcion}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Describe el problema con el mayor detalle posible..."
                className="w-full px-4 py-3 bg-white rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formData.Descripcion.trim().length > 0 && formData.Descripcion.trim().length < 10 && (
                <p className="text-xs text-red-500 mt-1">Debe ingresar al menos 10 caracteres ({formData.Descripcion.trim().length}/10).</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad Sugerida</label>
              <select 
                name="IdPrioridad"
                value={formData.IdPrioridad}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {prioridades.map(p => (
                  <option key={p.IdPrioridad} value={p.IdPrioridad}>{p.NombrePrioridad}</option>
                ))}
              </select>
            </div>

            {/* [FUNCIONALIDAD FUTURA] 
                La BD original de WinForms no cuenta con una columna en la tabla Incidencias para guardar fotos.
                Descomentar esto cuando se añada la columna FotoEvidencia VARBINARY(MAX) al SQL Server.
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjuntar Foto del Error</label>
              <input 
                type="file"
                accept="image/*"
                capture="environment"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-2">Puedes usar la cámara si estás en el celular.</p>
            </div>
            */}

            {successMsg ? (
              <div className="w-full bg-green-100 border border-green-400 text-green-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 mt-6">
                <FiCheckCircle className="text-xl" />
                <span>¡Incidencia creada con éxito!</span>
              </div>
            ) : (
              <button 
                type="submit"
                disabled={guardando}
                className="w-full bg-[#2988c9] hover:bg-[#3498DB] text-white font-bold py-3 px-4 rounded-sm shadow-md transition-colors mt-6 flex justify-center items-center space-x-2 disabled:opacity-50"
              >
                <FiSave className="text-lg" />
                <span>{guardando ? 'Guardando...' : 'Guardar Incidencia'}</span>
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};

export default NewIncident;
