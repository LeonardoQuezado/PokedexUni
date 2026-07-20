import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchMe, loginUser, logoutUser } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ownedCreatures, setOwnedCreatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    return fetchMe()
      .then((data) => {
        setUser(data.user);
        setOwnedCreatures(data.ownedCreatures || []);
      })
      .catch(() => {
        setUser(null);
        setOwnedCreatures([]);
      });
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function login(identifier, password) {
    const { user: loggedUser } = await loginUser({ identifier, password });
    setUser(loggedUser);
    await refresh();
    return loggedUser;
  }

  async function logout() {
    await logoutUser();
    setUser(null);
    setOwnedCreatures([]);
  }

  const value = { user, ownedCreatures, loading, login, logout, refresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
