import { useState, useEffect, useCallback } from 'react';
import { User, Address } from '../types';
import {
  requestCode, verifyCode, fetchProfile, fetchAddresses, refreshToken,
  getStoredToken, clearStoredToken,
} from '../api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Restore session on mount
  useEffect(() => {
    const tokens = getStoredToken();
    if (!tokens?.access) return;
    (async () => {
      try {
        const profile = await fetchProfile();
        setUser(profile);
        const addrs = await fetchAddresses();
        setAddresses(addrs);
      } catch {
        try {
          await refreshToken();
          const profile = await fetchProfile();
          setUser(profile);
          const addrs = await fetchAddresses();
          setAddresses(addrs);
        } catch {
          clearStoredToken();
        }
      }
    })();
  }, []);

  const loginWithPhone = useCallback(async (phone: string) => {
    await requestCode(phone);
  }, []);

  const verifyPhoneCode = useCallback(async (phone: string, code: string) => {
    const result = await verifyCode({ phone, code });
    const profile = await fetchProfile();
    setUser(profile);
    const addrs = await fetchAddresses();
    setAddresses(addrs);
    return result;
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setAddresses([]);
  }, []);

  const refreshAddresses = useCallback(async () => {
    const addrs = await fetchAddresses();
    setAddresses(addrs);
  }, []);

  return { user, addresses, loginWithPhone, verifyPhoneCode, logout, refreshAddresses };
}
