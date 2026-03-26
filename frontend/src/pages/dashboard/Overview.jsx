import { Link, useOutletContext } from "react-router-dom";

import KPICards from "../../components/KPICards";
import GoogleConnectionCard from "../../components/GoogleConnectionCard";
import TrafficChart from "../../components/TrafficChart";
import TrafficSourcesChart from "../../components/TrafficSourcesChart";
import KeywordsTable from "../../components/KeywordsTable";

export default function Overview() {
  const { profile, kpis, onRefresh, isLoading } = useOutletContext();

  return (
    <section className="card dashboard-card">
      <div className="card-row">
        <h2>Vue d'ensemble</h2>
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
      </div>

      <GoogleConnectionCard onConfigured={() => onRefresh({ silent: true })} />

      <div className="charts-row">
        <TrafficChart />
        <TrafficSourcesChart />
      </div>

      <KeywordsTable />

      <article className="panel dashboard-panel">
        <p className="panel-title">Espace personnel</p>
        <p>Bienvenue sur SEOmind.</p>
        <p>Le menu de gauche permet de naviguer entre les modules SEO.</p>
        <Link className="button-link dashboard-link" to="/contact">
          Contacter l'equipe
        </Link>
      </article>
    </section>
  );
}
