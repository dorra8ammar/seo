import { useOutletContext } from "react-router-dom";
import KeywordsTable from "../../components/KeywordsTable";

export default function Keywords() {
  const { kpis } = useOutletContext();

  return (
    <section className="card dashboard-card">
      <h2>Mots-cles</h2>
      <div className="grid dashboard-grid">
        <article className="panel dashboard-panel">
          <p className="panel-title">Mots-cles classes</p>
          <p className="big">{formatNumber(kpis?.keywordsCount)}</p>
          <p>Nombre de requetes remontees depuis Search Console.</p>
        </article>
        <article className="panel dashboard-panel">
          <p className="panel-title">SEO Score</p>
          <p className="big">{formatScore(kpis?.seoScore)}</p>
          <p>Score calcule a partir du trafic, du rebond et des mots-cles.</p>
        </article>
      </div>
      <KeywordsTable />
    </section>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR").format(Number(value));
}

function formatScore(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(Number(value))}/100`;
}
