import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/endpoints';
import { TOKEN_KEY, USER_KEY, LEGACY_LOGIN_KEY } from '../api/client';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  legacyLogin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        const u = await AsyncStorage.getItem(USER_KEY);
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { access, refresh, user: u } = res.data.Data;
    await AsyncStorage.setItem(TOKEN_KEY, access);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(access);
    setUser(u);
  };

  const legacyLogin = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { access, user: u } = res.data.Data;
    const legacyId = u ? String(u.legacy_login_id || u.id) : '3';
    await AsyncStorage.setItem(TOKEN_KEY, access);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    await AsyncStorage.setItem(LEGACY_LOGIN_KEY, legacyId);
    setToken(access);
    setUser(u);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem(LEGACY_LOGIN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, legacyLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
