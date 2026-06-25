import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL from '../config';

const AuthContext = createContext();

// Session expires after 8 hours of inactivity
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const SESSION_TS_KEY = 'session_last_active';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem(SESSION_TS_KEY);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const lastActive = localStorage.getItem(SESSION_TS_KEY);

    if (storedUser && token) {
      const now = Date.now();
      const elapsed = lastActive ? now - parseInt(lastActive, 10) : SESSION_TIMEOUT_MS + 1;

      if (elapsed > SESSION_TIMEOUT_MS) {
        // Session expired (PC was off or no activity for 8+ hours) — force re-login
        clearSession();
      } else {
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Refresh timestamp on resume
        localStorage.setItem(SESSION_TS_KEY, String(now));
      }
    }
    setLoading(false);
  }, [clearSession]);

  // Update activity timestamp on any user interaction
  useEffect(() => {
    const refreshTimestamp = () => {
      if (localStorage.getItem('token')) {
        localStorage.setItem(SESSION_TS_KEY, String(Date.now()));
      }
    };
    window.addEventListener('click', refreshTimestamp);
    window.addEventListener('keydown', refreshTimestamp);
    return () => {
      window.removeEventListener('click', refreshTimestamp);
      window.removeEventListener('keydown', refreshTimestamp);
    };
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/login`, { username, password });
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('token', res.data.token);
      localStorage.setItem(SESSION_TS_KEY, String(Date.now()));
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Error al iniciar sesión' };
    }
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

