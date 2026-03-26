import { useOutletContext } from "react-router-dom";

export default function Traffic() {
  const { kpis } = useOutletContext();

  return (
    <section className="card dashboard-card">
      <h2>Trafic</h2>
      <div className="grid dashboard-grid">
        <article className="panel dashboard-panel">
          <p className="panel-title">Trafic organique</p>
          <p className="big">{formatNumber(kpis?.traffic)}</p>
          <p>Sessions sur les 30 derniers jours.</p>
        </article>
        <article className="panel dashboard-panel">
          <p className="panel-title">Taux de rebond</p>
          <p className="big">{formatPercent(kpis?.bounceRate)}</p>
          <p>Pourcentage de sessions sans interaction supplementaire.</p>
        </article>
      </div>
    </section>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR").format(Number(value));
}

function formatPercent(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(1)}%`;
}
