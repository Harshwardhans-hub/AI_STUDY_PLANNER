import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  LayoutDashboard, BookOpen, CalendarDays, BarChart2,
  FileText, Brain, Timer, LogOut, Sparkles,
  MessageCircle, Layers, CalendarCheck, Settings
} from "lucide-react";

const NAV = [
  { to: "/",          label: "Dashboard",  icon: LayoutDashboard, end: true },
  { to: "/subjects",  label: "Subjects",   icon: BookOpen },
  { to: "/planner",   label: "AI Planner", icon: CalendarDays },
  { to: "/calendar",  label: "Calendar",   icon: CalendarCheck },
  { to: "/progress",  label: "Progress",   icon: BarChart2 },
];

const AI_NAV = [
  { to: "/chat",       label: "AI Tutor",       icon: MessageCircle },
  { to: "/flashcards", label: "Flashcards",     icon: Layers },
  { to: "/summarizer", label: "PDF Summarizer", icon: FileText },
];

export default function DashboardLayout() {
  const { dbUser, firebaseUser, logout } = useAuth();

  const displayName  = dbUser?.name  || firebaseUser?.displayName || "Student";
  const displayEmail = dbUser?.email || firebaseUser?.email       || "";
  const avatarUrl    = dbUser?.avatar_url || firebaseUser?.photoURL;
  const initials     = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully");
  };

  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <span className="sidebar-logo-text">MLH Project</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Main</span>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="nav-icon" size={18} />
              {label}
            </NavLink>
          ))}

          <span className="sidebar-section-label" style={{ marginTop: 12 }}>AI Tools</span>
          {AI_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="nav-icon" size={18} />
              {label}
            </NavLink>
          ))}



          {/* Gemini badge */}
          <div style={{
            marginTop: "auto",
            padding: "12px 8px 0",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-muted)",
            fontSize: "0.72rem",
          }}>
            <Sparkles size={12} />
            Powered by Gemini AI
          </div>
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to sign out">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">{initials}</div>
            )}
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-email">{displayEmail}</div>
            </div>
            <LogOut size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="main-content">
        <motion.div
          key={typeof window !== "undefined" ? window.location.pathname : ""}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ flex: 1 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
