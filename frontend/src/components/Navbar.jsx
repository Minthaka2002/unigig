import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  const dashboardPath = user?.role === "client" ? "/client" : "/student";

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink font-display text-sm font-bold text-paper">
            U
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Uni<span className="text-signal">Gig</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 font-body text-sm text-ink/70 md:flex">
          <a href="/#how-it-works" className="hover:text-ink">How it works</a>
          <a href="/#quota" className="hover:text-ink">The 20-hour cap</a>
          <a href="/#pricing" className="hover:text-ink">Fair pricing</a>
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <Link to={dashboardPath} className="btn-secondary !px-4 !py-2">
              Dashboard
            </Link>
            <button onClick={handleLogout} className="text-sm font-medium text-ink/60 hover:text-alert">
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-ink/70 hover:text-ink">
              Log in
            </Link>
            <Link to="/register" className="btn-primary !px-4 !py-2">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
