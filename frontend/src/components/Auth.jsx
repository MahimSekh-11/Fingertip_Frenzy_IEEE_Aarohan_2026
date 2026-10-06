import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { request } from "../services/api";
import { Loading } from "./ui";
const Context = createContext(null);
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [expired, setExpired] = useState(false);
  const refresh = () =>
    request("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  useEffect(() => {
    refresh();
    const handler = () => {
      setUser(null);
      setExpired(true);
    };
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);
  const login = async (body, admin = false) => {
    const d = await request(admin ? "/auth/admin/login" : "/auth/login", {
      method: "POST",
      body,
    });
    setUser(d.user);
    setExpired(false);
    return d.user;
  };
  const logout = async () => {
    await request("/auth/logout", { method: "POST" });
    setUser(null);
  };
  return (
    <Context.Provider
      value={{ user, loading, login, logout, refresh, expired }}
    >
      {children}
    </Context.Provider>
  );
}
export function Guard({ children, admin = false }) {
  const { user, loading } = useAuth(),
    location = useLocation();
  if (loading) return <Loading />;
  if (!user)
    return (
      <Navigate
        to={admin ? "/admin/login" : "/login"}
        state={{ from: location.pathname }}
        replace
      />
    );
  if (admin && user.role !== "ADMIN")
    return <Navigate to="/dashboard" replace />;
  return children;
}
