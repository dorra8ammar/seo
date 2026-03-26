const ACCESS_TOKEN_KEY = "seo_access_token";
const REFRESH_TOKEN_KEY = "seo_refresh_token";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

let refreshPromise = null;

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasToken() {
  return Boolean(getAccessToken());
}

function parseResponse(response) {
  return response
    .json()
    .catch(() => ({}));
}

async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw { detail: "Impossible de contacter l'API. Verifie que le backend Django est demarre." };
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    throw Object.keys(data || {}).length ? data : { detail: "Requete API echouee." };
  }
  return data;
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token available");

  const response = await fetch("/api/auth/refresh/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ refresh }),
  });

  const data = await parseResponse(response);
  if (!response.ok || !data.access) {
    clearTokens();
    throw data;
  }

  setTokens({ access: data.access });
  return data.access;
}

async function authFetch(url, options = {}) {
  const makeRequest = (token) =>
    fetch(url, {
      ...options,
      headers: {
        ...JSON_HEADERS,
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await makeRequest(getAccessToken());

  if (response.status !== 401) return response;

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    const refreshedAccess = await refreshPromise;
    response = await makeRequest(refreshedAccess);
  } catch {
    clearTokens();
  }

  return response;
}

export async function registerUser(payload) {
  return requestJson("/api/auth/register/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(email) {
  return requestJson("/api/auth/forgot-password/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(payload) {
  return requestJson("/api/auth/reset-password/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  const data = await requestJson("/api/auth/login/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  setTokens(data);
  return data;
}

export async function loginWithGoogle(idToken) {
  const data = await requestJson("/api/auth/google-login/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ id_token: idToken }),
  });

  setTokens(data);
  return data;
}

export async function getGoogleOAuthUrl() {
  const response = await authFetch("/api/auth/google/oauth/url/", { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getGoogleConnection() {
  const response = await authFetch("/api/auth/google/connection/", { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function saveGoogleConnectionSelection(payload) {
  const response = await authFetch("/api/auth/google/connection/select/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function disconnectGoogleConnection() {
  const response = await authFetch("/api/auth/google/connection/disconnect/", {
    method: "POST",
  });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function submitContact(payload) {
  return requestJson("/api/contact/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  const response = await authFetch("/api/auth/me/", { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getOverview() {
  const response = await authFetch("/api/analytics/overview/", { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getKpis() {
  const response = await authFetch("/api/analytics/kpis/", { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getTraffic(days = 30) {
  const response = await authFetch(`/api/analytics/traffic/?days=${encodeURIComponent(days)}`, { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getTrafficSources(days = 30) {
  const response = await authFetch(`/api/analytics/traffic/sources/?days=${encodeURIComponent(days)}`, { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getKeywords(limit = 20) {
  const response = await authFetch(`/api/analytics/keywords/?limit=${encodeURIComponent(limit)}`, { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getRecommendations() {
  const response = await authFetch("/api/analytics/recommendations/", { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getTrends() {
  const response = await authFetch("/api/analytics/trends/", { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getTopPages() {
  const response = await authFetch("/api/analytics/top-pages/", { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function getAdminUsers(email = "") {
  const q = email ? `?email=${encodeURIComponent(email)}` : "";
  const response = await authFetch(`/api/auth/users/${q}`, { method: "GET" });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function updateUserActive(userId, isActive) {
  const response = await authFetch(`/api/auth/users/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}

export async function deleteAdminUser(userId) {
  const response = await authFetch(`/api/auth/users/${userId}/`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const data = await parseResponse(response);
    throw data;
  }
}

export async function createAdminUser(payload) {
  const response = await authFetch("/api/auth/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(response);
  if (!response.ok) throw data;
  return data;
}
