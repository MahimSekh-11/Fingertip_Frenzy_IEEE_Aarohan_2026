import React, { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Gamepad2,
  Trophy,
  Users,
  UserRound,
  LogOut,
  Menu,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "./Auth";
import { Notice } from "./ui";
export function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-symbol">
        F<span>F</span>
      </span>
      <span>
        Fingertip <b>Frenzy</b>
        <small>IEEE SB NIT DURGAPUR · AAROHAN 2026</small>
      </span>
    </Link>
  );
}
const studentLinks = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/games", "Games", Gamepad2],
  ["/team", "My team", Users],
  ["/profile", "Profile", UserRound],
];
const adminLinks = [
  ["/admin/leaderboard", "Leaderboard", Trophy],
  ["/admin/games/puzzle", "01 · Image Formation", Gamepad2],
  ["/admin/games/detective", "02 · Detective Case", Gamepad2],
  ["/admin/games/calculator", "03 · AI Calculator", Gamepad2],
  ["/admin/games/memory", "04 · Number Memory", Gamepad2],
];
export function Shell({ children, admin = false, title, subtitle }) {
  const { user, logout } = useAuth(),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    nav = useNavigate();
  admin = admin || user?.role === "ADMIN";
  return (
    <div className="platform workspace">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className={open ? "open" : ""}>
        <Brand />
        <div className="nav-label">
          {admin ? "EVENT OPERATIONS" : "YOUR WORKSPACE"}
        </div>
        <nav>
          {(admin ? adminLinks : studentLinks).map(([href, label, Icon]) => (
            <NavLink key={href} to={href} onClick={() => setOpen(false)}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">{user?.name?.[0]}</span>
          <div>
            <strong>{user?.name}</strong>
            <small>{admin ? "Administrator" : user?.rollNo}</small>
          </div>
          <button
            className="icon"
            aria-label="Log out"
            onClick={() =>
              logout()
                .then(() => nav("/login"))
                .catch((e) => setError(e.message))
            }
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <button
            className="icon mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <span>
            {admin ? "ADMIN CONSOLE" : "FINGERTIP FRENZY / AAROHAN 2026"}
          </span>
          <Link to={admin ? "/admin/leaderboard" : "/team"}>
            {admin ? "Live standings" : "My team scores"}{" "}
            <ArrowUpRight size={14} />
          </Link>
        </header>
        <main id="main" tabIndex={-1}>
          {title && (
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {admin ? "EVENT CONTROL" : "COMPETE. COLLABORATE. DISCOVER."}
                </p>
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
              <span className="event-tag">AAROHAN 2026</span>
            </div>
          )}
          <Notice error>{error}</Notice>
          {children}
        </main>
        <footer>
          IEEE SB NIT Durgapur · Aarohan 2026{" "}
          <span>Four challenges. One arena.</span>
        </footer>
      </div>
      {open && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
