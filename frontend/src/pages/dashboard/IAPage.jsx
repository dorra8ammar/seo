import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { getRecommendations } from "../../api";
import GoogleConnectionCard from "../../components/GoogleConnectionCard";

const PRIORITY_LABELS = {
  haute: "Haute",
  moyenne: "Moyenne",
  faible: "Faible",
};

const ICONS = {
  warning: "!",
  note: "TXT",
  search: "SEO",
  star: "S",
  brain: "NLP",
  link: "LINK",
};

export default function IAPage() {
  const { onRefresh } = useOutletContext();
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchRecommendations() {
      setLoading(true);
      setError("");
      try {
        const response = await getRecommendations();
        if (cancelled) return;
        setData(response.data || []);
        setCount(response.count || 0);
        setSnapshot(response.snapshot || null);
      } catch (requestError) {
        if (cancelled) return;
        setError(formatRequestError(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecommendations();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="card dashboard-card">
      <div className="ia-header">
        <div>
          <h2>IA Recommandations</h2>
          <p>Analyse NLP et regles SEO basees sur vos donnees Analytics et Search Console.</p>
        </div>
        <div className="ia-chip">{loading ? "Analyse..." : `${count} recommandations`}</div>
      </div>

      <GoogleConnectionCard onConfigured={() => onRefresh({ silent: true })} />

      {snapshot ? (
        <div className="ia-summary-grid">
          <article className="panel dashboard-panel">
            <p className="panel-title">Trafic</p>
            <p className="big">{formatNumber(snapshot.traffic)}</p>
            <p>Sessions sur 30 jours</p>
          </article>
          <article className="panel dashboard-panel">
            <p className="panel-title">Rebond</p>
            <p className="big">{formatPercent(snapshot.bounceRate)}</p>
            <p>Qualite d'engagement</p>
          </article>
          <article className="panel dashboard-panel">
            <p className="panel-title">Mots-cles</p>
            <p className="big">{formatNumber(snapshot.keywordsCount)}</p>
            <p>Top requetes analysees</p>
          </article>
          <article className="panel dashboard-panel">
            <p className="panel-title">SEO Score</p>
            <p className="big">{formatScore(snapshot.seoScore)}</p>
            <p>Score de synthese</p>
          </article>
        </div>
      ) : null}

      {loading ? <div className="ia-loading">Generation des recommandations...</div> : null}
      {error ? <div className="message error">{error}</div> : null}

      {!loading && !error ? (
        <div className="ia-list">
          {data.map((item) => (
            <article key={item.id} className={`ia-card ia-${item.priority}`}>
              <div className="ia-card-head">
                <div className="ia-icon">{ICONS[item.icon] || "AI"}</div>
                <div>
                  <p className="ia-priority">{PRIORITY_LABELS[item.priority] || item.priority}</p>
                  <h3>{item.title}</h3>
                </div>
              </div>
              <p className="ia-desc">{item.desc}</p>
              <div className="ia-action-block">
                <span>Action recommandee</span>
                <strong>{item.action}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatRequestError(error) {
  if (!error) return "Erreur inconnue";
  if (typeof error === "string") return error;
  if (error.detail && typeof error.detail === "string") return error.detail;
  return "Impossible de generer les recommandations IA.";
}

function formatNumber(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR").format(Number(value));
}

function formatPercent(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(1)}%`;
}

function formatScore(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(Number(value))}/100`;
}
