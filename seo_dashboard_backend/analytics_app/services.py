import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings

from accounts.google_oauth import GoogleOAuthError, get_valid_google_access_token
from accounts.models import User, UserGoogleConnection

try:
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, OrderBy, RunReportRequest
except ImportError:  # pragma: no cover - depends on optional package
    BetaAnalyticsDataClient = None
    DateRange = Dimension = Metric = OrderBy = RunReportRequest = None

try:
    from google.oauth2 import service_account
except ImportError:  # pragma: no cover - depends on optional package
    service_account = None

try:
    from googleapiclient.discovery import build
except ImportError:  # pragma: no cover - depends on optional package
    build = None

try:
    import spacy
except ImportError:  # pragma: no cover - optional dependency
    spacy = None


class AnalyticsConfigError(Exception):
    pass


@dataclass
class AnalyticsKpis:
    traffic: int
    bounce_rate: float
    keywords_count: int
    seo_score: int


@dataclass
class TrafficPoint:
    date: str
    sessions: int
    users: int


@dataclass
class TrafficSourcePoint:
    source: str
    sessions: int
    percentage: int


@dataclass
class KeywordPoint:
    id: int
    keyword: str
    position: int
    clicks: int
    impressions: int
    ctr: float


@dataclass
class PagePoint:
    url: str
    clicks: int
    position: float
    meta_description: str


@dataclass
class RecommendationPoint:
    id: int
    priority: str
    icon: str
    title: str
    desc: str
    action: str


def _calculate_seo_score(traffic: int, bounce_rate: float, keywords_count: int) -> int:
    # Weighted heuristic normalized to a 0-100 SEO score.
    traffic_score = min(40, int((traffic / 100000) * 40))
    bounce_score = max(0, min(30, int(((100 - bounce_rate) / 100) * 30)))
    keywords_score = min(30, int((keywords_count / 2000) * 30))
    return max(0, min(100, traffic_score + bounce_score + keywords_score))


def _request_google_json(url: str, access_token: str, *, method="GET", payload=None):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")

    request = Request(url, headers=headers, data=data, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise AnalyticsConfigError(f"Google API error: {body}") from exc
    except URLError as exc:
        raise AnalyticsConfigError(f"Google API unavailable: {exc}") from exc

    if not body:
        return {}
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise AnalyticsConfigError("Google API returned invalid JSON.") from exc


def _get_user_connection(user: User):
    connection = getattr(user, "google_connection", None)
    if connection is None or not connection.refresh_token:
        raise AnalyticsConfigError("Google account not connected. Connect Google from the dashboard first.")
    return connection


def _get_user_ga4_property_id(connection: UserGoogleConnection):
    property_id = (connection.ga4_property_id or "").strip()
    if not property_id:
        raise AnalyticsConfigError("No GA4 property selected. Choose a property in the Google connection panel.")
    return property_id


def _get_user_site_url(connection: UserGoogleConnection):
    site_url = (connection.search_console_site_url or "").strip()
    if not site_url:
        raise AnalyticsConfigError("No Search Console site selected. Choose a site in the Google connection panel.")
    return site_url


def _run_ga4_report_for_user(user: User, payload: dict):
    connection = _get_user_connection(user)
    property_id = _get_user_ga4_property_id(connection)
    try:
        access_token = get_valid_google_access_token(connection)
    except GoogleOAuthError as exc:
        raise AnalyticsConfigError(str(exc)) from exc
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    return _request_google_json(url, access_token, method="POST", payload=payload)


def _run_search_console_query_for_user(user: User, payload: dict):
    connection = _get_user_connection(user)
    site_url = _get_user_site_url(connection)
    try:
        access_token = get_valid_google_access_token(connection)
    except GoogleOAuthError as exc:
        raise AnalyticsConfigError(str(exc)) from exc

    encoded_site = quote(site_url, safe="")
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{encoded_site}/searchAnalytics/query"
    return _request_google_json(url, access_token, method="POST", payload=payload)


_SPACY_MODEL = None


def _get_nlp_model():
    global _SPACY_MODEL
    if _SPACY_MODEL is not None:
        return _SPACY_MODEL
    if spacy is None:
        return None
    try:
        _SPACY_MODEL = spacy.load("fr_core_news_sm")
    except OSError:
        _SPACY_MODEL = None
    return _SPACY_MODEL


def _build_credentials(scopes):
    if service_account is None:
        raise AnalyticsConfigError(
            "Google auth client library missing. Install google-auth."
        )

    info_json = getattr(settings, "GA4_SERVICE_ACCOUNT_JSON", "").strip()
    file_path = getattr(settings, "GA4_SERVICE_ACCOUNT_FILE", "").strip()

    if info_json:
        try:
            info = json.loads(info_json)
        except json.JSONDecodeError as exc:
            raise AnalyticsConfigError("GA4_SERVICE_ACCOUNT_JSON is not valid JSON.") from exc
        return service_account.Credentials.from_service_account_info(info, scopes=scopes)

    if file_path:
        return service_account.Credentials.from_service_account_file(file_path, scopes=scopes)

    return None


def _build_client():
    if BetaAnalyticsDataClient is None:
        raise AnalyticsConfigError(
            "Google Analytics client library missing. Install google-analytics-data."
        )

    credentials = _build_credentials(["https://www.googleapis.com/auth/analytics.readonly"])
    if credentials is not None:
        return BetaAnalyticsDataClient(credentials=credentials)
    return BetaAnalyticsDataClient()


def _build_search_console_client():
    if build is None:
        raise AnalyticsConfigError(
            "Google Search Console client library missing. Install google-api-python-client."
        )

    credentials = _build_credentials(["https://www.googleapis.com/auth/webmasters.readonly"])
    if credentials is None:
        raise AnalyticsConfigError(
            "GA4 service account credentials are required for Search Console access."
        )

    return build("searchconsole", "v1", credentials=credentials, cache_discovery=False)


def _get_keywords_count():
    site_url = str(getattr(settings, "SEARCH_CONSOLE_SITE_URL", "")).strip()
    if not site_url:
        raise AnalyticsConfigError("SEARCH_CONSOLE_SITE_URL is not configured.")

    service = _build_search_console_client()
    response = (
        service.searchanalytics()
        .query(
            siteUrl=site_url,
            body={
                "startDate": "2024-01-01",
                "endDate": "today",
                "dimensions": ["query"],
                "rowLimit": 1000,
            },
        )
        .execute()
    )
    rows = response.get("rows", [])
    return len(rows)


def get_ga4_kpis(user: User):
    response = _run_ga4_report_for_user(
        user,
        {
            "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
            "metrics": [{"name": "sessions"}, {"name": "bounceRate"}],
        },
    )

    keywords_count = len(get_search_console_keywords(user, limit=1000))

    rows = response.get("rows", [])
    metric_values = rows[0].get("metricValues", []) if rows else []
    traffic = int(float(metric_values[0].get("value", 0))) if len(metric_values) > 0 else 0
    bounce_rate = round(float(metric_values[1].get("value", 0)), 2) if len(metric_values) > 1 else 0.0

    return AnalyticsKpis(
        traffic=traffic,
        bounce_rate=bounce_rate,
        keywords_count=keywords_count,
        seo_score=_calculate_seo_score(traffic, bounce_rate, keywords_count),
    )


def get_ga4_traffic(user: User, days: int):
    if days <= 0:
        raise AnalyticsConfigError("days must be a positive integer.")

    response = _run_ga4_report_for_user(
        user,
        {
            "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
            "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
            "dimensions": [{"name": "date"}],
            "orderBys": [{"dimension": {"dimensionName": "date"}}],
        },
    )

    rows = response.get("rows", [])
    if not rows:
        return []

    points = []
    for row in rows:
        dimensions = row.get("dimensionValues", [])
        metric_values = row.get("metricValues", [])
        points.append(
            TrafficPoint(
                date=dimensions[0].get("value", "") if dimensions else "",
                sessions=int(float(metric_values[0].get("value", 0))) if len(metric_values) > 0 else 0,
                users=int(float(metric_values[1].get("value", 0))) if len(metric_values) > 1 else 0,
            )
        )
    return points


def get_ga4_traffic_sources(user: User, days: int = 30):
    if days <= 0:
        raise AnalyticsConfigError("days must be a positive integer.")

    response = _run_ga4_report_for_user(
        user,
        {
            "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
            "metrics": [{"name": "sessions"}],
            "dimensions": [{"name": "sessionDefaultChannelGroup"}],
        },
    )

    rows = response.get("rows", [])
    if not rows:
        return [], 0

    raw_points = []
    total = 0
    for row in rows:
        metric_values = row.get("metricValues", [])
        dimensions = row.get("dimensionValues", [])
        sessions = int(float(metric_values[0].get("value", 0))) if metric_values else 0
        total += sessions
        raw_points.append(
            {
                "source": dimensions[0].get("value", "Other") if dimensions else "Other",
                "sessions": sessions,
            }
        )

    formatted = [
        TrafficSourcePoint(
            source=item["source"] or "Other",
            sessions=item["sessions"],
            percentage=round((item["sessions"] / total) * 100) if total else 0,
        )
        for item in raw_points
    ]
    return formatted, total


def get_search_console_keywords(user: User, limit: int = 20):
    if limit <= 0:
        raise AnalyticsConfigError("limit must be a positive integer.")

    response = _run_search_console_query_for_user(
        user,
        {
            "startDate": "2025-01-01",
            "endDate": "today",
            "dimensions": ["query"],
            "rowLimit": limit,
        },
    )

    rows = response.get("rows", [])
    rows = sorted(rows, key=lambda row: row.get("clicks", 0), reverse=True)

    result = []
    for index, row in enumerate(rows, start=1):
        result.append(
            KeywordPoint(
                id=index,
                keyword=(row.get("keys") or [""])[0],
                position=round(row.get("position", 0)),
                clicks=int(row.get("clicks", 0)),
                impressions=int(row.get("impressions", 0)),
                ctr=round(float(row.get("ctr", 0)) * 100, 1),
            )
        )

    return result


def get_top_pages_data():
    return [
        PagePoint(
            url="/blog/seo-audit-checklist",
            clicks=480,
            position=7.1,
            meta_description="Checklist pratique pour realiser un audit SEO complet.",
        ),
        PagePoint(
            url="/services/technical-seo",
            clicks=361,
            position=6.4,
            meta_description="Optimisation technique SEO pour accelerer l'indexation et les performances.",
        ),
        PagePoint(
            url="/blog/internal-linking-guide",
            clicks=299,
            position=8.2,
            meta_description="Guide de maillage interne pour renforcer la pertinence des pages strategiques.",
        ),
        PagePoint(
            url="/contact",
            clicks=196,
            position=11.5,
            meta_description="",
        ),
        PagePoint(
            url="/pricing",
            clicks=171,
            position=12.2,
            meta_description="",
        ),
    ]


def _extract_keyword_topics(keywords):
    phrases = [item.keyword for item in keywords if item.keyword]
    if not phrases:
        return []

    model = _get_nlp_model()
    if model is None:
        fallback = []
        for phrase in phrases[:5]:
            token = phrase.split()[0].strip().lower()
            if token and token not in fallback:
                fallback.append(token)
        return fallback[:3]

    counts = {}
    for phrase in phrases:
        doc = model(phrase)
        for token in doc:
            if token.is_stop or token.is_punct:
                continue
            lemma = token.lemma_.strip().lower()
            if len(lemma) < 3:
                continue
            counts[lemma] = counts.get(lemma, 0) + 1
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [item[0] for item in ranked[:3]]


def get_ai_recommendations(user: User):
    kpis = get_ga4_kpis(user)
    keywords = get_search_console_keywords(user, limit=20)
    pages = get_top_pages_data()

    traffic = kpis.traffic
    bounce = kpis.bounce_rate
    seo_score = kpis.seo_score

    recommendations = []

    if traffic < 10000:
        recommendations.append(
            RecommendationPoint(
                id=1,
                priority="haute",
                icon="warning",
                title="Trafic organique faible",
                desc=f"Votre trafic est de {traffic} sessions sur 30 jours. La croissance organique reste limitee.",
                action="Ciblez des mots-cles longue traine et publiez du contenu repondant a des intentions precises.",
            )
        )

    if float(bounce) > 60:
        recommendations.append(
            RecommendationPoint(
                id=2,
                priority="haute",
                icon="warning",
                title="Taux de rebond trop eleve",
                desc=f"Taux de rebond a {bounce}%. Les visiteurs quittent le site sans interaction suffisante.",
                action="Renforcez les CTA, l'introduction des pages et la coherence entre requete, titre et contenu.",
            )
        )

    pages_no_meta = [page for page in pages if not page.meta_description]
    if pages_no_meta:
        recommendations.append(
            RecommendationPoint(
                id=3,
                priority="haute",
                icon="note",
                title="Meta descriptions manquantes",
                desc=f"{len(pages_no_meta)} pages importantes n'ont pas de meta description exploitable.",
                action="Ajoutez des meta descriptions uniques de 150 a 160 caracteres sur les pages prioritaires.",
            )
        )

    bad_keywords = [keyword for keyword in keywords if keyword.position > 10]
    if len(bad_keywords) > 5:
        recommendations.append(
            RecommendationPoint(
                id=4,
                priority="moyenne",
                icon="search",
                title="Mots-cles hors premiere page",
                desc=f"{len(bad_keywords)} mots-cles sont encore au-dela de la position 10.",
                action="Travaillez ces pages avec enrichissement semantique, maillage interne et optimisation des balises.",
            )
        )

    if seo_score < 60:
        recommendations.append(
            RecommendationPoint(
                id=5,
                priority="moyenne",
                icon="star",
                title="Score SEO a renforcer",
                desc=f"Score actuel : {seo_score}/100. Le socle SEO reste ameliorable.",
                action="Priorisez les recommandations haute priorite avant d'attaquer les optimisations secondaires.",
            )
        )

    topics = _extract_keyword_topics(keywords)
    if topics:
        topics_label = ", ".join(topics)
        recommendations.append(
            RecommendationPoint(
                id=6,
                priority="faible",
                icon="brain",
                title="Themes semantiques detectes",
                desc=f"L'analyse NLP retrouve surtout les themes suivants : {topics_label}.",
                action="Structurez des clusters de contenu autour de ces themes pour gagner en autorite thematique.",
            )
        )

    recommendations.append(
        RecommendationPoint(
            id=7,
            priority="faible",
            icon="link",
            title="Ameliorer le maillage interne",
            desc="Les pages les plus visibles peuvent transmettre plus d'autorite aux pages de conversion.",
            action="Ajoutez des liens internes depuis vos articles performants vers les pages commerciales et pages en position 11-20.",
        )
    )

    order = {"haute": 0, "moyenne": 1, "faible": 2}
    recommendations.sort(key=lambda item: (order.get(item.priority, 99), item.id))
    return recommendations, {
        "traffic": traffic,
        "bounceRate": bounce,
        "seoScore": seo_score,
        "keywordsCount": len(keywords),
        "pagesCount": len(pages),
    }
