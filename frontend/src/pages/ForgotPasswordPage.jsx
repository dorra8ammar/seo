import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const data = await forgotPassword(email);
      setMessage(data.detail || "Un email de reinitialisation a ete envoye si le compte existe.");
    } catch (requestError) {
      setError(formatError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-v2-wrap">
      <section className="auth-v2-card">
        <h2>Mot de passe oublie</h2>
        <p>Entrez votre email pour recevoir un lien de reinitialisation.</p>

        <form onSubmit={handleSubmit} className="auth-v2-form">
          <label>Adresse email</label>
          <input
            placeholder="vous@exemple.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {message ? <p className="message success">{message}</p> : null}
          {error ? <p className="message error">{error}</p> : null}

          <button type="submit" disabled={loading} className="auth-v2-main-btn">
            {loading ? "Envoi..." : "Envoyer le lien"}
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
  return "Impossible d'envoyer l'email de reinitialisation.";
}
