import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client';
import type { User } from '../api/client';
import { getErrorMessage } from '../lib/workbench';
import { AuthContext, type AuthStatus, type LoginInput } from './auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    api.hasStoredSession() ? 'checking' : 'anonymous',
  );
  const [error, setError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    try {
      const currentUser = await api.me();
      setUser(currentUser);
      setStatus('authenticated');
      setError(null);
    } catch (requestError) {
      api.clearSession();
      setUser(null);
      setStatus('anonymous');
      setError(getErrorMessage(requestError, '登录已过期，请重新登录'));
    }
  }, []);

  useEffect(() => {
    if (status !== 'checking') {
      return;
    }

    const timer = window.setTimeout(() => {
      void restoreSession();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [restoreSession, status]);

  const login = useCallback(async (input: LoginInput) => {
    const response = await api.login(input);
    setUser(response.user);
    setStatus('authenticated');
    setError(null);

    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({
      error,
      login,
      logout,
      status,
      user,
    }),
    [error, login, logout, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
