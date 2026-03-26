import { useState } from "react";

import { submitContact } from "../api";

const defaultForm = {
  nom: "",
  email: "",
  sujet: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(defaultForm);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await submitContact(form);
      setSent(true);
      setForm(defaultForm);
    } catch (submitError) {
      setError(formatContactError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <section className="contact-page">
        <div className="contact-success">
          <h1>Message envoye</h1>
          <p>Nous vous repondons sous 24h.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="contact-page">
      <div className="contact-card">
        <p className="contact-eyebrow">Contact</p>
        <h1>Contactez-nous</h1>
        <p>Une question ? Envoyez-nous un message.</p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nom">Nom complet</label>
            <input
              id="nom"
              type="text"
              name="nom"
              placeholder="Dorra Ammar"
              value={form.nom}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="vous@exemple.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="sujet">Sujet</label>
            <input
              id="sujet"
              type="text"
              name="sujet"
              placeholder="Question sur le dashboard"
              value={form.sujet}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              placeholder="Votre message ici..."
              rows={5}
              value={form.message}
              onChange={handleChange}
              required
            />
          </div>

          {error ? <p className="message error">{error}</p> : null}

          <button type="submit" className="auth-v2-main-btn" disabled={isSubmitting}>
            {isSubmitting ? "Envoi..." : "Envoyer le message"}
          </button>
        </form>
      </div>
    </section>
  );
}

function formatContactError(error) {
  if (!error) return "Erreur lors de l'envoi. Reessayez.";
  if (typeof error === "string") return error;
  if (error.detail && typeof error.detail === "string") return error.detail;
  const entries = Object.entries(error);
  if (!entries.length) return "Erreur lors de l'envoi. Reessayez.";
  return entries
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" | ");
}
