import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('crickpulse_token'));
  const [loading, setLoading] = useState(true);

  // Persistent login: Rehydrate user session on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('crickpulse_token');
      if (storedToken) {
        try {
          const data = await authService.getMe();
          if (data.success && data.user) {
            setUser(data.user);
            setToken(storedToken);
          } else {
            // Invalid session
            localStorage.removeItem('crickpulse_token');
            setUser(null);
            setToken(null);
          }
        } catch (error) {
          console.warn('Session rehydration failed:', error.message);
          localStorage.removeItem('crickpulse_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login handler
  const login = async (credentials) => {
    const data = await authService.loginUser(credentials);
    if (data.success && data.token) {
      localStorage.setItem('crickpulse_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.message || 'Login failed');
  };

  // Register handler
  const register = async (userData) => {
    const data = await authService.registerUser(userData);
    if (data.success && data.token) {
      localStorage.setItem('crickpulse_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.message || 'Registration failed');
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('crickpulse_token');
    setToken(null);
    setUser(null);
  };

  // Update user session data
  const updateUserData = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume AuthContext easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
