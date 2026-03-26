import { NavLink } from "react-router-dom";

const menuItems = [
  { path: "/dashboard", icon: "📊", label: "Vue d'ensemble" },
  { path: "/dashboard/trafic", icon: "📈", label: "Trafic" },
  { path: "/dashboard/keywords", icon: "🔍", label: "Mots-cles" },
  { path: "/dashboard/pages", icon: "📄", label: "Pages" },
  { path: "/dashboard/ia", icon: "🤖", label: "IA Recommandations" },
  { path: "/dashboard/contact", icon: "✉️", label: "Contact" },
];

export default function Sidebar({ profile, onLogout }) {
  const initials = getInitials(profile);
  const displayName = profile?.first_name || profile?.last_name
    ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
    : profile?.username || "Utilisateur";
  const role = profile?.is_superuser ? "Admin" : "Utilisateur";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">SI</div>
        <span className="logo-text">
          SEO<span>mind</span>
        </span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-info">
          <div className="avatar">{initials}</div>
          <div>
            <div className="user-name">{displayName}</div>
            <div className="user-role">{role}</div>
          </div>
        </div>
        <button className="logout-btn" type="button" onClick={onLogout}>
          Deconnexion
        </button>
      </div>
    </aside>
  );
}

function getInitials(profile) {
  const first = (profile?.first_name || profile?.username || "U").trim()[0] || "U";
  const last = (profile?.last_name || "").trim()[0] || "";
  return `${first}${last}`.toUpperCase();
}
