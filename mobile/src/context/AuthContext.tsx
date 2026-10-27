import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiService, setAuthToken, setServerUrl, getServerUrl } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  serverUrl: string;
  updateServerUrl: (url: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  quickLogin: (preset: 'iitd' | 'nitt' | 'bits') => Promise<boolean>;
  logout: () => void;
  instituteName: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setLocalServerUrl] = useState(getServerUrl());

  const updateServerUrl = (url: string) => {
    setServerUrl(url);
    setLocalServerUrl(getServerUrl());
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await apiService.login(email, password);
      setUser(res.user);
      setToken(res.token);
      return true;
    } catch (err: any) {
      console.error('Login error:', err?.response?.data || err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (preset: 'iitd' | 'nitt' | 'bits'): Promise<boolean> => {
    const creds = {
      iitd: { email: 'registrar@iitd.ac.in', pass: 'Inst@123' },
      nitt: { email: 'registrar@nitt.edu', pass: 'Inst@123' },
      bits: { email: 'finance@bits-pilani.ac.in', pass: 'Inst@123' },
    }[preset];

    return login(creds.email, creds.pass);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
  };

  const instituteName = user?.institutionId
    ? typeof user.institutionId === 'object'
      ? user.institutionId.name
      : 'Authorized Institution'
    : user?.name || 'Technical Institution';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        serverUrl,
        updateServerUrl,
        login,
        quickLogin,
        logout,
        instituteName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
