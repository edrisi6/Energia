// ─────────────────────────────────────────────────────────────
// Auth state for the whole app, shared via React Context.
// Stores the logged-in user and exposes login()/logout(). On startup it
// restores the session from the saved token by calling /auth/me.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session

  // On first load, if we have a token, ask the server who we are.
  useEffect(() => {
    let active = true;
    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await api.get('/auth/me');
        if (active) setUser(user);
      } catch {
        // Token invalid/expired — clear it.
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, []);

  async function login(username, pin) {
    const { token, user } = await api.post('/auth/login', { username, pin });
    setToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  // Convenience role helpers used across the UI.
  const value = {
    user,
    loading,
    login,
    logout,
    isOwner: user?.role === 'owner',
    isManager: user?.role === 'manager',
    isServiceOperator: user?.role === 'service_operator',
    // Owners and managers can manage vehicles/records/users.
    canManage: user?.role === 'owner' || user?.role === 'manager',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
