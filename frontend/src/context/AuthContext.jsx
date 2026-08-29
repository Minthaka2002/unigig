import React, { createContext, useContext, useEffect, useState } from "react";
import { api, saveSession, clearSession, loadUser } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("unigig_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem("unigig_user", JSON.stringify(freshUser));
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.login({ email, password });
    saveSession(data.access_token, data.user);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await api.register(payload);
    saveSession(data.access_token, data.user);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
