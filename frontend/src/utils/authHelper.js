const ACCESS_TOKEN_KEY = "seo_access_token";
const REFRESH_TOKEN_KEY = "seo_refresh_token";

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isStoredTokenValid(key) {
  const token = localStorage.getItem(key);
  if (!token) return false;

  const payload = decodeToken(token);
  if (!payload?.exp) {
    localStorage.removeItem(key);
    return false;
  }

  const now = Date.now() / 1000;
  if (payload.exp <= now) {
    localStorage.removeItem(key);
    return false;
  }

  return true;
}

export function isAuthenticated() {
  const accessValid = isStoredTokenValid(ACCESS_TOKEN_KEY);
  const refreshValid = isStoredTokenValid(REFRESH_TOKEN_KEY);
  return accessValid || refreshValid;
}
