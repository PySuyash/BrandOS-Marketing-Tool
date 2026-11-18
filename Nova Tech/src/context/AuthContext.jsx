import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, extractApiError, setSessionToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brandosModal, setBrandosModal] = useState({
    open: false,
    status: 'idle',
    targetRoute: '/submissions/new',
    redirectUrl: null,
    errorCode: null,
    errorMessage: null,
    configuredUrl: import.meta.env.VITE_BRANDOS_URL || '',
    ssoContract: null,
  });

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        setSessionToken(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    if (data?.sessionToken) setSessionToken(data.sessionToken);
    setUser(data.user);
    return data.user;
  }, []);

  const demoLogin = useCallback(async (email) => {
    const { data } = await apiClient.post('/auth/demo-login', { email });
    if (data?.sessionToken) setSessionToken(data.sessionToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    if (data?.sessionToken) setSessionToken(data.sessionToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setSessionToken(null);
      setUser(null);
    }
  }, []);

  const updateLocalUser = useCallback((updated) => {
    setUser(updated);
  }, []);

  const closeBrandosModal = useCallback(() => {
    setBrandosModal((prev) => ({ ...prev, open: false }));
  }, []);

  const launchBrandos = useCallback(async (targetRoute = '/submissions/new') => {
    setBrandosModal({
      open: true,
      status: 'loading',
      targetRoute,
      redirectUrl: null,
      errorCode: null,
      errorMessage: null,
      configuredUrl: import.meta.env.VITE_BRANDOS_URL || '',
      ssoContract: null,
    });

    try {
      const { data } = await apiClient.post('/brandos/sso-ticket', { targetRoute });
      if (data?.reachable && data?.redirectUrl) {
        setBrandosModal((prev) => ({
          ...prev,
          status: 'ready',
          redirectUrl: data.redirectUrl,
        }));
        window.location.assign(data.redirectUrl);
      } else {
        setBrandosModal((prev) => ({
          ...prev,
          status: 'error',
          errorCode: 'BRANDOS_UNEXPECTED_RESPONSE',
          errorMessage: 'BrandOS SSO ticket response did not contain a valid redirect URL.',
        }));
      }
    } catch (err) {
      const resp = err?.response?.data;
      setBrandosModal({
        open: true,
        status: 'error',
        targetRoute,
        redirectUrl: null,
        errorCode: resp?.code || 'BRANDOS_CONNECTION_FAILED',
        errorMessage: extractApiError(
          err,
          'Unable to verify BrandOS authentication integration.'
        ),
        configuredUrl: resp?.configuredUrl || import.meta.env.VITE_BRANDOS_URL || '',
        ssoContract: resp?.ssoContract || null,
      });
    }
  }, []);

  const isAuthenticated = Boolean(user);
  const isEmployee = Boolean(
    user && (user.websiteRole === 'employee' || user.websiteRole === 'admin')
  );
  const isAdmin = Boolean(user && user.websiteRole === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isEmployee,
        isAdmin,
        login,
        demoLogin,
        register,
        logout,
        refreshUser,
        updateLocalUser,
        launchBrandos,
        brandosModal,
        closeBrandosModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
