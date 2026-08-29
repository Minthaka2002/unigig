import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-ink/40">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(role) ? role : role ? [role] : null;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "client" ? "/client" : "/student"} replace />;
  }
  return children;
}
