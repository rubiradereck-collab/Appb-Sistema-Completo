import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurar sesión desde localStorage
    const storedUser = localStorage.getItem('appb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('appb_user', JSON.stringify(res.data.user));
        localStorage.setItem('appb_token', res.data.token);
        return true;
      }
    } catch (error) {
      console.error('Error logging in', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('appb_user');
    localStorage.removeItem('appb_token');
  };

  const updateUser = (newUserData) => {
    const updated = { ...user, ...newUserData };
    setUser(updated);
    localStorage.setItem('appb_user', JSON.stringify(updated));
  };

  if (loading) return <div>Cargando sesión...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
