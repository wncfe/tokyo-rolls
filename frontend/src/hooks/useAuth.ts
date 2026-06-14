import { useState, useEffect, useCallback } from 'react';
import { User, LoginData, RegisterData } from '../types';
import {
  loginUser, registerUser, fetchProfile, refreshToken,
  getStoredToken, clearStoredToken,
} from '../api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  // Restore session on mount
  useEffect(() => {
    const tokens = getStoredToken();
    if (!tokens?.access) return;
    (async () => {
      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch {
        try {
          await refreshToken();
          const profile = await fetchProfile();
          setUser(profile);
        } catch {
          clearStoredToken();
        }
      }
    })();
  }, []);

  const login = useCallback(async (data: LoginData) => {
    await loginUser(data);
    const profile = await fetchProfile();
    setUser(profile);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    await registerUser(data);
    try {
      await loginUser({ username: data.username, password: data.password });
      const profile = await fetchProfile();
      setUser(profile);
    } catch {
      clearStoredToken();
      throw new Error('Регистрация прошла, но не удалось войти. Попробуйте войти вручную.');
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  return { user, login, register, logout };
}
