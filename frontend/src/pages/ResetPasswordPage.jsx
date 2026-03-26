import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { resetPassword } from "../api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { uid = "", token = "" } = useParams();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const data = await resetPassword({ uid, token, password, password2 });
      setMessage(data.detail || "Mot de passe mis a jour.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (requestError) {
      setError(formatError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-v2-wrap">
      <section className="auth-v2-card">
        <h2>Nouveau mot de passe</h2>
        <p>Definissez un nouveau mot de passe pour votre compte.</p>

        <form onSubmit={handleSubmit} className="auth-v2-form">
          <label>Nouveau mot de passe</label>
          <input
            placeholder="Minimum 8 caracteres"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label>Confirmer le mot de passe</label>
          <input
            placeholder="Retapez le mot de passe"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />

          {message ? <p className="message success">{message}</p> : null}
          {error ? <p className="message error">{error}</p> : null}

          <button type="submit" disabled={loading} className="auth-v2-main-btn">
            {loading ? "Validation..." : "Mettre a jour"}
          </button>
        </form>

        <p className="auth-v2-switch">
          Retour a la <Link to="/login">connexion</Link>
        </p>
      </section>
    </section>
  );
}

function formatError(error) {
  if (!error) return "Erreur inconnue";
  if (typeof error === "string") return error;
  if (error.detail && typeof error.detail === "string") return error.detail;
  return "Impossible de mettre a jour le mot de passe.";
}
