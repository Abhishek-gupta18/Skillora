import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getToken,
  getStoredUser,
  setToken,
  setStoredUser,
  clearToken,
  setUnauthorizedHandler,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    // Wired into the API client — fires on any 401 from a protected endpoint.
    setUnauthorizedHandler(() => {
      setTokenState(null);
      setUser(null);
    });
  }, []);

  const handleAuthSuccess = useCallback((data) => {
    // data: { token, user: { id, email, role } }
    setToken(data.token);
    setStoredUser(data.user);
    setTokenState(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = {
    token,
    user,
    role: user?.role || null,
    isAuthenticated: Boolean(token),
    handleAuthSuccess,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
