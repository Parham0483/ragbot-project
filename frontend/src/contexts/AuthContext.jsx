import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.getProfile()
        .then(res => {
          setUser(res.data);
        })
        .catch((err) => {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            logout();
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    const profile = await authAPI.getProfile();
    setUser(profile.data);
    return profile.data;
  };

  const loginWithGoogle = async (credential) => {
    const response = await authAPI.googleLogin(credential);
    localStorage.setItem('access_token', response.data.tokens.access);
    localStorage.setItem('refresh_token', response.data.tokens.refresh);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    // dev mode: backend returns tokens immediately (no email verification needed)
    if (response.data.tokens) {
      localStorage.setItem('access_token', response.data.tokens.access);
      localStorage.setItem('refresh_token', response.data.tokens.refresh);
      setUser(response.data.user);
    }
    return response.data;
  };

  const verifyEmailAndLogin = async ({ token, uid }) => {
    const response = await authAPI.verifyEmail({ token, uid });
    localStorage.setItem('access_token', response.data.tokens.access);
    localStorage.setItem('refresh_token', response.data.tokens.refresh);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, loginWithGoogle, register, verifyEmailAndLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
