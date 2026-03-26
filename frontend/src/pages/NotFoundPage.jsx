import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="not-found">
      <div className="error-code">404</div>
      <h1>Page introuvable</h1>
      <p>La page que vous cherchez n'existe pas ou a ete deplacee.</p>

      <div className="not-found-actions">
        <button className="auth-v2-main-btn" type="button" onClick={() => navigate("/")}>
          Retour a l'accueil
        </button>
        <button className="secondary" type="button" onClick={() => navigate(-1)}>
          Page precedente
        </button>
      </div>
    </section>
  );
}
