import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="landing-page">
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />

      <header className="landing-nav">
        <a className="landing-logo" href="#hero">
          <div className="landing-logo-icon">SM</div>
          <div className="landing-logo-text">SEO<span>mind</span></div>
        </a>
        <ul className="landing-links">
          <li><a href="#features">Fonctionnalites</a></li>
          <li><a href="#auth">Acces</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <div className="landing-actions">
          <Link className="landing-btn-ghost" to="/login">Se connecter</Link>
          <Link className="landing-btn-cta" to="/register">Commencer</Link>
        </div>
      </header>

      <section className="landing-hero" id="hero">
        <div className="landing-hero-left">
          <div className="landing-badge">
            <span className="landing-dot" />
            Propulse par IA · NLP · Google Analytics
          </div>
          <h1 className="landing-title">
            Analysez votre trafic.
            <br />
            <span>Optimisez votre SEO</span>
            <br />
            avec SEOmind.
          </h1>
          <p className="landing-desc">
            Collectez vos donnees depuis Analytics et Search Console. Visualisez vos KPIs et
            recevez des recommandations SEO guidees par l'IA.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-btn-main" to="/register">Creer un compte gratuit</Link>
            <a className="landing-btn-outline" href="#auth">Voir l'acces</a>
          </div>
          <div className="landing-stats">
            <div>
              <p>84K+</p>
              <span>Sessions analysees</span>
            </div>
            <div>
              <p>1.2K</p>
              <span>Mots-cles suivis</span>
            </div>
            <div>
              <p>98%</p>
              <span>Precision IA</span>
            </div>
          </div>
        </div>

        <div className="landing-hero-right">
          <div className="landing-float b1">Trafic +12.4%</div>
          <div className="landing-float b2">3 recommandations IA</div>
          <div className="landing-float b3">#2 dashboard seo</div>

          <article className="landing-preview">
            <div className="landing-preview-head">
              <span>Vue d'ensemble</span>
              <small>LIVE</small>
            </div>
            <svg viewBox="0 0 360 90" className="landing-chart" aria-hidden="true">
              <defs>
                <linearGradient id="landingArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,80 C30,74 60,60 100,45 C140,30 180,22 220,28 C260,34 300,14 360,8 L360,90 L0,90 Z" fill="url(#landingArea)" />
              <path d="M0,80 C30,74 60,60 100,45 C140,30 180,22 220,28 C260,34 300,14 360,8" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="landing-kpis">
              <div>
                <label>TRAFIC ORGANIQUE</label>
                <strong>84,320</strong>
                <small>+12.4%</small>
              </div>
              <div>
                <label>SCORE SEO</label>
                <strong>78/100</strong>
                <small>+5 pts</small>
              </div>
            </div>
            <p className="landing-ai-chip">IA: Optimiser les meta descriptions de 12 pages</p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="features">
        <p className="landing-section-label">Fonctionnalites</p>
        <h2>Tout ce dont vous avez besoin</h2>
        <p className="landing-section-sub">Un dashboard complet pour piloter votre SEO avec des actions concretes.</p>
        <div className="landing-features">
          <article className="landing-feature-card">
            <h3>Collecte automatique</h3>
            <p>Connexion directe avec Google Analytics et Search Console.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Visualisation avancee</h3>
            <p>Graphiques interactifs pour trafic, pages et performances.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Recommandations IA</h3>
            <p>Priorites SEO intelligentes basees sur les donnees de ton site.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Suivi des mots-cles</h3>
            <p>Tracking des positions et opportunites de croissance.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Alertes intelligentes</h3>
            <p>Detection des baisses de trafic et signaux de risque.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Rapports automatiques</h3>
            <p>Rapports clairs exploitables en reunion client ou equipe.</p>
          </article>
        </div>
      </section>

      <section className="landing-auth" id="auth">
        <article className="landing-auth-card">
          <h3>Se connecter</h3>
          <p>Accede a votre dashboard SEOmind</p>
          <Link className="landing-btn-main" to="/login">Aller a la connexion</Link>
        </article>
        <article className="landing-auth-card featured">
          <h3>Creer un compte</h3>
          <p>Commencez gratuitement et activez votre espace en quelques minutes.</p>
          <Link className="landing-btn-main" to="/register">Creer mon compte</Link>
        </article>
      </section>

      <footer className="landing-footer" id="contact">
        <p>© 2026 SEOmind Dashboard</p>
        <div>
          <span>contact@seomind.com</span>
          <span>+216 50 300 600</span>
        </div>
      </footer>
    </div>
  );
}
