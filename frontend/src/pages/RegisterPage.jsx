import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export default function RegisterPage({ form, setForm, onSubmit, onGoogleLogin, googleClientId, isLoading }) {
  const googleBtnRef = useRef(null);
  const [siteUrl, setSiteUrl] = useState("");

  useEffect(() => {
    if (!googleClientId || typeof onGoogleLogin !== "function") return;

    let cancelled = false;

    const initGoogle = () => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response?.credential) {
            onGoogleLogin(response.credential);
          }
        },
      });

      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        text: "signup_with",
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [googleClientId, onGoogleLogin]);

  return (
    <section className="auth-v2-wrap">
      <section className="auth-v2-card auth-v2-card-featured">
        <h2>Creer un compte</h2>
        <p>Gratuit - Acces complet 14 jours</p>

        <form onSubmit={onSubmit} className="auth-v2-form">
          <div className="auth-v2-split">
            <div>
              <label>Prenom</label>
              <input
                placeholder="Dorra"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div>
              <label>Nom</label>
              <input
                placeholder="Ammar"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>

          <label>Adresse email</label>
          <input
            placeholder="vous@exemple.com"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <label>Mot de passe</label>
          <input
            placeholder="Minimum 8 caracteres"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <label>Confirmer mot de passe</label>
          <input
            placeholder="Retapez le mot de passe"
            type="password"
            value={form.password2}
            onChange={(e) => setForm({ ...form, password2: e.target.value })}
            required
          />

          <label>URL de votre site web</label>
          <input
            placeholder="https://monsite.com"
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
          />

          <button type="submit" disabled={isLoading} className="auth-v2-main-btn">
            {isLoading ? "Inscription..." : "Creer mon compte"}
          </button>
        </form>

        <div className="auth-v2-divider"><span>ou</span></div>

        {googleClientId ? (
          <div className="auth-v2-google-render" ref={googleBtnRef} />
        ) : (
          <p className="auth-v2-help">Google Login indisponible: definir `VITE_GOOGLE_CLIENT_ID`.</p>
        )}

        <p className="auth-v2-switch">
          Deja un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </section>
    </section>
  );
}
