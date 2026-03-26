import { Link } from "react-router-dom";
import KPICards from "../components/KPICards";

export default function DashboardPage({ profile, kpis, onRefresh, isLoading }) {
  return (
    <section className="card dashboard-card">
      <div className="card-row">
        <h2>Dashboard</h2>
        <button className="dashboard-refresh-btn" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? "Mise a jour..." : "Actualiser"}
        </button>
      </div>

      <div className="grid dashboard-grid">
        <article className="panel dashboard-panel">
          <p className="panel-title">Utilisateur</p>
          <p className="big">{profile?.username || "-"}</p>
          <p>{profile?.email || "-"}</p>
        </article>

        <article className="panel dashboard-panel">
          <p className="panel-title">Performance SEO</p>
          <KPICards kpis={kpis} isLoading={isLoading} />
        </article>

        <article className="panel dashboard-panel">
          <p className="panel-title">Espace personnel</p>
          <p>Bienvenue sur SEOmind.</p>
          <p>Tu peux acceder a la connexion, inscription et contact depuis l'accueil.</p>
          <Link className="button-link dashboard-link" to="/">Retour accueil</Link>
        </article>
      </div>
    </section>
  );
}
