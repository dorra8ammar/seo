import { useEffect, useMemo, useState } from "react";

import {
  disconnectGoogleConnection,
  getGoogleConnection,
  getGoogleOAuthUrl,
  saveGoogleConnectionSelection,
} from "../api";

export default function GoogleConnectionCard({ onConfigured }) {
  const [connection, setConnection] = useState(null);
  const [propertyId, setPropertyId] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    loadConnection();
  }, []);

  useEffect(() => {
    function handleMessage(event) {
      if (!event?.data?.type) return;
      if (event.data.type === "google-oauth-success") {
        setMessageType("success");
        setMessage("Compte Google connecte. Selectionnez maintenant la propriete et le site.");
        loadConnection();
        return;
      }
      if (event.data.type === "google-oauth-error") {
        setMessageType("error");
        setMessage(event.data.message || "Connexion Google impossible.");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const isConfigured = useMemo(
    () => Boolean(connection?.selectedPropertyId && connection?.selectedSiteUrl),
    [connection]
  );

  async function loadConnection() {
    setLoading(true);
    try {
      const data = await getGoogleConnection();
      setConnection(data);
      setPropertyId(data.selectedPropertyId || data.availableProperties?.[0]?.id || "");
      setSiteUrl(data.selectedSiteUrl || data.availableSites?.[0]?.siteUrl || "");
    } catch (error) {
      setMessageType("error");
      setMessage(formatError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      const { authUrl } = await getGoogleOAuthUrl();
      const popup = window.open(authUrl, "google-oauth", "width=560,height=720");
      if (!popup) {
        setMessageType("error");
        setMessage("Popup bloque. Autorisez les popups pour continuer.");
      }
    } catch (error) {
      setMessageType("error");
      setMessage(formatError(error));
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await saveGoogleConnectionSelection({ propertyId, siteUrl });
      setConnection(data);
      setMessageType("success");
      setMessage("Configuration Google enregistree.");
      if (typeof onConfigured === "function") {
        onConfigured();
      }
    } catch (error) {
      setMessageType("error");
      setMessage(formatError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    try {
      await disconnectGoogleConnection();
      setConnection({
        connected: false,
        googleEmail: "",
        selectedPropertyId: "",
        selectedPropertyName: "",
        selectedSiteUrl: "",
        availableProperties: [],
        availableSites: [],
      });
      setPropertyId("");
      setSiteUrl("");
      setMessageType("info");
      setMessage("Connexion Google supprimee.");
      if (typeof onConfigured === "function") {
        onConfigured();
      }
    } catch (error) {
      setMessageType("error");
      setMessage(formatError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="google-connection-card">
      <div className="google-connection-head">
        <div>
          <h3>Connexion Google</h3>
          <p>Chaque utilisateur relie son propre compte Google Analytics et Search Console.</p>
        </div>
        <div className={`google-status ${isConfigured ? "ready" : "pending"}`}>
          {isConfigured ? "Configure" : "A configurer"}
        </div>
      </div>

      {message ? <p className={`message ${messageType}`}>{message}</p> : null}

      {loading ? (
        <div className="google-loading">Chargement de la connexion Google...</div>
      ) : !connection?.connected ? (
        <div className="google-empty">
          <p>Aucun compte Google Analytics/Search Console relie pour cet utilisateur.</p>
          <button type="button" className="dashboard-refresh-btn" onClick={handleConnect}>
            Connecter Google
          </button>
        </div>
      ) : (
        <form className="google-config-form" onSubmit={handleSave}>
          <div className="google-linked-account">
            <span>Compte relie</span>
            <strong>{connection.googleEmail || "Compte Google"}</strong>
          </div>

          <label>
            Propriete GA4
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
              <option value="">Selectionner une propriete</option>
              {(connection.availableProperties || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Site Search Console
            <select value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} required>
              <option value="">Selectionner un site</option>
              {(connection.availableSites || []).map((item) => (
                <option key={item.siteUrl} value={item.siteUrl}>
                  {item.siteUrl}
                </option>
              ))}
            </select>
          </label>

          <div className="google-config-actions">
            <button type="submit" className="dashboard-refresh-btn" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button type="button" className="logout-btn" onClick={handleDisconnect} disabled={saving}>
              Deconnecter Google
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function formatError(error) {
  if (!error) return "Erreur inconnue";
  if (typeof error === "string") return error;
  if (error.detail && typeof error.detail === "string") return error.detail;
  return "Operation Google impossible.";
}
