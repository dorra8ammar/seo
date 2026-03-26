import json
from datetime import timedelta
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import User, UserGoogleConnection


GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GA4_ACCOUNT_SUMMARIES_URL = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200"
SEARCH_CONSOLE_SITES_URL = "https://searchconsole.googleapis.com/webmasters/v3/sites"
STATE_SALT = "seo-google-oauth-state"

GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
]


class GoogleOAuthError(Exception):
    pass


def _require_google_oauth_config():
    if not getattr(settings, "GOOGLE_CLIENT_ID", "").strip():
        raise GoogleOAuthError("GOOGLE_CLIENT_ID is not configured.")
    if not getattr(settings, "GOOGLE_CLIENT_SECRET", "").strip():
        raise GoogleOAuthError("GOOGLE_CLIENT_SECRET is not configured.")


def _get_redirect_uri():
    custom_uri = getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "").strip()
    if custom_uri:
        return custom_uri
    backend_base_url = getattr(settings, "BACKEND_BASE_URL", "").rstrip("/")
    if not backend_base_url:
        raise GoogleOAuthError("BACKEND_BASE_URL is not configured.")
    return f"{backend_base_url}/api/auth/google/oauth/callback/"


def _request_json(url, *, method="GET", payload=None, headers=None):
    request_headers = {"Accept": "application/json", **(headers or {})}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    request = Request(url, data=data, headers=request_headers, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            details = json.loads(body)
        except json.JSONDecodeError:
            details = body
        raise GoogleOAuthError(f"Google API error: {details}") from exc
    except URLError as exc:
        raise GoogleOAuthError(f"Google API unavailable: {exc}") from exc

    if not body:
        return {}
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise GoogleOAuthError("Invalid JSON response returned by Google.") from exc


def _request_form_urlencoded(url, form_data):
    payload = urlencode(form_data).encode("utf-8")
    request = Request(url, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            details = json.loads(body)
        except json.JSONDecodeError:
            details = body
        raise GoogleOAuthError(f"Google token exchange failed: {details}") from exc
    except URLError as exc:
        raise GoogleOAuthError(f"Google token exchange unavailable: {exc}") from exc

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise GoogleOAuthError("Invalid token response returned by Google.") from exc


def build_google_oauth_url(user: User, origin: str):
    _require_google_oauth_config()
    redirect_uri = _get_redirect_uri()
    state = signing.dumps({"user_id": user.id, "origin": origin}, salt=STATE_SALT)
    query = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(GOOGLE_SCOPES),
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent",
            "state": state,
        }
    )
    return f"{GOOGLE_AUTH_BASE_URL}?{query}"


def exchange_google_code(code: str):
    _require_google_oauth_config()
    redirect_uri = _get_redirect_uri()
    return _request_form_urlencoded(
        GOOGLE_TOKEN_URL,
        {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
    )


def refresh_google_access_token(connection: UserGoogleConnection):
    _require_google_oauth_config()
    if not connection.refresh_token:
        raise GoogleOAuthError("No Google refresh token stored for this user.")

    data = _request_form_urlencoded(
        GOOGLE_TOKEN_URL,
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": connection.refresh_token,
            "grant_type": "refresh_token",
        },
    )

    connection.access_token = data.get("access_token", "")
    expires_in = int(data.get("expires_in", 3600))
    connection.token_expiry = timezone.now() + timedelta(seconds=expires_in)
    if data.get("scope"):
        connection.scopes = data["scope"]
    connection.save(update_fields=["access_token", "token_expiry", "scopes", "updated_at"])
    return connection.access_token


def get_valid_google_access_token(connection: UserGoogleConnection):
    if not connection.access_token:
        raise GoogleOAuthError("No Google access token stored for this user.")
    if connection.token_expiry and connection.token_expiry > timezone.now() + timedelta(minutes=2):
        return connection.access_token
    return refresh_google_access_token(connection)


def fetch_google_userinfo(access_token: str):
    return _request_json(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})


def store_google_tokens(user: User, token_data: dict, userinfo: dict):
    connection, _ = UserGoogleConnection.objects.get_or_create(user=user)
    connection.access_token = token_data.get("access_token", "")
    if token_data.get("refresh_token"):
        connection.refresh_token = token_data["refresh_token"]
    expires_in = int(token_data.get("expires_in", 3600))
    connection.token_expiry = timezone.now() + timedelta(seconds=expires_in)
    connection.scopes = token_data.get("scope", "")
    connection.google_email = str(userinfo.get("email", "")).strip().lower()
    connection.save()
    return connection


def list_ga4_properties(connection: UserGoogleConnection):
    access_token = get_valid_google_access_token(connection)
    payload = _request_json(GA4_ACCOUNT_SUMMARIES_URL, headers={"Authorization": f"Bearer {access_token}"})
    properties = []
    for summary in payload.get("accountSummaries", []):
        for item in summary.get("propertySummaries", []):
            property_name = item.get("displayName") or item.get("property")
            property_ref = item.get("property", "")
            property_id = property_ref.split("/")[-1] if property_ref else ""
            if property_id:
                properties.append({"id": property_id, "name": property_name})
    return properties


def list_search_console_sites(connection: UserGoogleConnection):
    access_token = get_valid_google_access_token(connection)
    payload = _request_json(SEARCH_CONSOLE_SITES_URL, headers={"Authorization": f"Bearer {access_token}"})
    sites = []
    for item in payload.get("siteEntry", []):
        site_url = item.get("siteUrl")
        if site_url:
            sites.append({"siteUrl": site_url, "permissionLevel": item.get("permissionLevel", "")})
    return sites


def get_google_connection_summary(user: User):
    connection = getattr(user, "google_connection", None)
    if connection is None or not connection.refresh_token:
        return {
            "connected": False,
            "googleEmail": "",
            "selectedPropertyId": "",
            "selectedPropertyName": "",
            "selectedSiteUrl": "",
            "availableProperties": [],
            "availableSites": [],
        }

    available_properties = list_ga4_properties(connection)
    available_sites = list_search_console_sites(connection)

    return {
        "connected": True,
        "googleEmail": connection.google_email,
        "selectedPropertyId": connection.ga4_property_id,
        "selectedPropertyName": connection.ga4_property_name,
        "selectedSiteUrl": connection.search_console_site_url,
        "availableProperties": available_properties,
        "availableSites": available_sites,
    }


def save_google_selection(user: User, property_id: str, site_url: str):
    connection = getattr(user, "google_connection", None)
    if connection is None or not connection.refresh_token:
        raise GoogleOAuthError("Google account is not connected for this user.")

    available_properties = list_ga4_properties(connection)
    available_sites = list_search_console_sites(connection)

    matching_property = next((item for item in available_properties if item["id"] == property_id), None)
    if matching_property is None:
        raise GoogleOAuthError("Selected GA4 property is not accessible for this user.")

    matching_site = next((item for item in available_sites if item["siteUrl"] == site_url), None)
    if matching_site is None:
        raise GoogleOAuthError("Selected Search Console site is not accessible for this user.")

    connection.ga4_property_id = property_id
    connection.ga4_property_name = matching_property["name"]
    connection.search_console_site_url = site_url
    connection.save(update_fields=["ga4_property_id", "ga4_property_name", "search_console_site_url", "updated_at"])
    return connection


def disconnect_google_connection(user: User):
    connection = getattr(user, "google_connection", None)
    if connection is None:
        return
    connection.access_token = ""
    connection.refresh_token = ""
    connection.google_email = ""
    connection.scopes = ""
    connection.token_expiry = None
    connection.ga4_property_id = ""
    connection.ga4_property_name = ""
    connection.search_console_site_url = ""
    connection.save()


def load_signed_oauth_state(state: str):
    try:
        return signing.loads(state, salt=STATE_SALT, max_age=900)
    except signing.BadSignature as exc:
        raise GoogleOAuthError("OAuth state is invalid or expired.") from exc
