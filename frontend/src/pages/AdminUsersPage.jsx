import { useEffect, useState } from "react";

import { createAdminUser, deleteAdminUser, getAdminUsers, updateUserActive } from "../api";

export default function AdminUsersPage({ isSuperuser }) {
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    is_active: true,
  });

  useEffect(() => {
    if (isSuperuser) {
      loadUsers("");
    }
  }, [isSuperuser]);

  async function loadUsers(emailQuery) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminUsers(emailQuery);
      setUsers(normalizeUsers(data));
    } catch (err) {
      setError(getErrorMessage(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(e) {
    e.preventDefault();
    await loadUsers(email.trim());
  }

  async function onToggle(user) {
    setLoading(true);
    setError("");

    try {
      const updated = await updateUserActive(user.id, !user.is_active);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(user) {
    const confirmed = window.confirm(`Supprimer l'utilisateur ${user.email} ?`);
    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      await deleteAdminUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onCreateUser(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const created = await createAdminUser(newUser);
      setUsers((prev) => [created, ...prev]);
      setNewUser({
        email: "",
        username: "",
        password: "",
        first_name: "",
        last_name: "",
        is_active: true,
      });
      setShowCreateForm(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!isSuperuser) {
    return (
      <section className="card">
        <h2>Gestion Utilisateurs</h2>
        <p>Acces reserve au superuser.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Gestion Utilisateurs</h2>
      <p>Recherche par email (ex: Gmail) et active/desactive les comptes.</p>
      <button type="button" onClick={() => setShowCreateForm((v) => !v)} disabled={loading}>
        {showCreateForm ? "Fermer formulaire" : "Ajouter utilisateur"}
      </button>

      {showCreateForm && (
        <form onSubmit={onCreateUser} className="form-grid" style={{ marginTop: 12 }}>
          <div className="split">
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
          </div>
          <div className="split">
            <input
              type="text"
              placeholder="Prenom"
              value={newUser.first_name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, first_name: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Nom"
              value={newUser.last_name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, last_name: e.target.value }))}
            />
          </div>
          <div className="split">
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={newUser.is_active}
                onChange={(e) => setNewUser((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Actif
            </label>
          </div>
          <button type="submit" disabled={loading}>{loading ? "Creation..." : "Creer utilisateur"}</button>
        </form>
      )}

      <form onSubmit={onSearch} className="form-grid">
        <input
          type="text"
          placeholder="Recherche email (ex: @gmail.com)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={loading}>{loading ? "Recherche..." : "Rechercher"}</button>
      </form>

      {error && <p className="message error">{error}</p>}

      <div className="panel" style={{ marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Username</th>
              <th>Actif</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan="4">Aucun utilisateur.</td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.username}</td>
                <td>{user.is_active ? "Oui" : "Non"}</td>
                <td>
                  <button type="button" onClick={() => onToggle(user)} disabled={loading}>
                    {user.is_active ? "Desactiver" : "Activer"}
                  </button>
                  {" "}
                  <button type="button" onClick={() => onDelete(user)} disabled={loading}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getErrorMessage(error) {
  if (!error) return "Erreur inconnue";
  if (typeof error === "string") return error;
  if (error.detail) return error.detail;
  return Object.entries(error)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : JSON.stringify(v)}`)
    .join(" | ");
}

function normalizeUsers(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}
