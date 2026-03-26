import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function LoginPage({ form, setForm, onSubmit, onGoogleLogin, googleClientId, isLoading }) {
  const googleBtnRef = useRef(null);

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
        text: "continue_with",
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
      <section className="auth-v2-card">
        <h2>Se connecter</h2>
        <p>Accedez a votre dashboard SEOmind</p>

        <form onSubmit={onSubmit} className="auth-v2-form">
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
            placeholder="********"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <Link className="auth-v2-forgot" to="/forgot-password">Mot de passe oublie ?</Link>

          <button type="submit" disabled={isLoading} className="auth-v2-main-btn">
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="auth-v2-divider"><span>ou</span></div>

        {googleClientId ? (
          <div className="auth-v2-google-render" ref={googleBtnRef} />
        ) : (
          <p className="auth-v2-help">Google Login indisponible: definir `VITE_GOOGLE_CLIENT_ID`.</p>
        )}

        <p className="auth-v2-switch">
          Pas encore de compte ? <Link to="/register">Creer un compte</Link>
        </p>
      </section>
    </section>
  );
}
