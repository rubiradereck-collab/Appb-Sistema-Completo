import axios from 'axios';

const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

// Interceptor para agregar token (simulado)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('appb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar respuestas y errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si no hay respuesta del servidor (caído o sin internet)
    if (!error.response) {
      window.dispatchEvent(new CustomEvent('app-error', { detail: 'Error de conexión: Por favor, revisa tu conexión a internet o intenta más tarde.' }));
      return Promise.reject(error);
    }
    
    // Si el JWT expiró o es inválido
    if (error.response.status === 401 || error.response.status === 403) {
      localStorage.removeItem('appb_token');
      localStorage.removeItem('appb_user');
      window.location.href = '/login';
    }

    // Otros errores del API (400, 500)
    if (error.response.data && error.response.data.message) {
      window.dispatchEvent(new CustomEvent('app-error', { detail: error.response.data.message }));
    }

    return Promise.reject(error);
  }
);

export default api;
