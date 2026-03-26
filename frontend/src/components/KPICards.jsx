export default function KPICards({ kpis, isLoading }) {
  if (isLoading && !kpis) {
    return <p>Chargement...</p>;
  }

  return (
    <section className="kpi-grid">
      <article className="kpi-card">
        <span>Trafic organique</span>
        <h2>{formatTraffic(kpis?.traffic)}</h2>
      </article>

      <article className="kpi-card">
        <span>Taux de rebond</span>
        <h2>{formatBounceRate(kpis?.bounceRate)}</h2>
      </article>

      <article className="kpi-card">
        <span>Mots-cles classes</span>
        <h2>{formatTraffic(kpis?.keywordsCount)}</h2>
      </article>

      <article className="kpi-card">
        <span>Score SEO</span>
        <h2>{formatScore(kpis?.seoScore)}</h2>
      </article>
    </section>
  );
}

function formatTraffic(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR").format(Number(value));
}

function formatBounceRate(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(1)}%`;
}

function formatScore(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(Number(value))}/100`;
}
