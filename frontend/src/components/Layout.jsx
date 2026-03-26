import { Link, Outlet, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Accueil" },
  { to: "/login", label: "Connexion" },
  { to: "/register", label: "Inscription" },
];

export default function Layout({ isConnected, isSuperuser, onLogout, message, messageType }) {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <main className={isAuthPage ? "site auth-theme" : "site"}>
      {!isLanding && (
        <header className="topbar">
          <div className="topbar-inner">
            <div>
              <p className="brand">SEOmind</p>
              <p className="brand-sub">SEO Toolkit</p>
            </div>

            <nav className="menu">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={location.pathname === item.to ? "menu-link active" : "menu-link"}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/contact"
                className={location.pathname === "/contact" ? "menu-link active" : "menu-link"}
              >
                Contact
              </Link>
              <Link
                to="/dashboard"
                className={location.pathname === "/dashboard" ? "menu-link active" : "menu-link"}
              >
                Dashboard
              </Link>
              {isConnected && isSuperuser && (
                <Link
                  to="/admin-users"
                  className={location.pathname === "/admin-users" ? "menu-link active" : "menu-link"}
                >
                  Super User
                </Link>
              )}
            </nav>

            <button className="secondary" disabled={!isConnected} onClick={onLogout}>
              Se deconnecter
            </button>
          </div>
        </header>
      )}

      <section className={isLanding ? "content-wrap landing-wrap" : isAuthPage ? "content-wrap auth-wrap" : "content-wrap"}>
        <section className="content">
          {message && <p className={`message ${messageType}`}>{message}</p>}
          <Outlet />
        </section>
      </section>
    </main>
  );
}
