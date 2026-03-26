from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .services import (
    AnalyticsConfigError,
    get_ai_recommendations,
    get_ga4_kpis,
    get_ga4_traffic,
    get_ga4_traffic_sources,
    get_top_pages_data,
    get_search_console_keywords,
)

User = get_user_model()


def _build_trend(seed_value: int):
    # Deterministic demo series so frontend charts always have data.
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    organic = [
        120 + seed_value,
        135 + seed_value,
        142 + seed_value,
        160 + seed_value,
        171 + seed_value,
        169 + seed_value,
        182 + seed_value,
    ]
    clicks = [
        42 + seed_value // 2,
        49 + seed_value // 2,
        51 + seed_value // 2,
        60 + seed_value // 2,
        64 + seed_value // 2,
        66 + seed_value // 2,
        70 + seed_value // 2,
    ]
    return {"labels": labels, "organic_sessions": organic, "clicks": clicks}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def overview(request):
    users_count = User.objects.count()
    seed = users_count % 11

    return Response(
        {
            "message": "Analytics overview OK",
            "user": request.user.username,
            "kpis": {
                "organic_sessions": 1240 + (seed * 12),
                "avg_position": round(12.8 - (seed * 0.15), 2),
                "ctr": round(3.2 + (seed * 0.11), 2),
                "indexed_pages": 86 + seed,
            },
            "change": {
                "organic_sessions_pct": round(4.5 + (seed * 0.3), 1),
                "ctr_pct": round(1.2 + (seed * 0.1), 1),
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def kpis(request):
    try:
        kpi_values = get_ga4_kpis(request.user)
    except AnalyticsConfigError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        return Response(
            {"detail": f"Google Analytics request failed: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {
            "traffic": kpi_values.traffic,
            "bounceRate": kpi_values.bounce_rate,
            "keywordsCount": kpi_values.keywords_count,
            "seoScore": kpi_values.seo_score,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def trends(request):
    users_count = User.objects.count()
    seed = users_count % 11
    return Response(_build_trend(seed))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def traffic(request):
    try:
        days = int(request.query_params.get("days", "30"))
    except ValueError:
        return Response({"detail": "days must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rows = get_ga4_traffic(request.user, days)
    except AnalyticsConfigError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        return Response(
            {"detail": f"Google Analytics request failed: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {
            "success": True,
            "data": [
                {
                    "date": row.date,
                    "sessions": row.sessions,
                    "users": row.users,
                }
                for row in rows
            ],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def traffic_sources(request):
    try:
        days = int(request.query_params.get("days", "30"))
    except ValueError:
        return Response({"detail": "days must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rows, total = get_ga4_traffic_sources(request.user, days)
    except AnalyticsConfigError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        return Response(
            {"detail": f"Google Analytics request failed: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {
            "success": True,
            "data": [
                {
                    "source": row.source,
                    "sessions": row.sessions,
                    "percentage": row.percentage,
                }
                for row in rows
            ],
            "total": total,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def keywords(request):
    try:
        limit = int(request.query_params.get("limit", "20"))
    except ValueError:
        return Response({"detail": "limit must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rows = get_search_console_keywords(request.user, limit)
    except AnalyticsConfigError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        return Response(
            {"detail": f"Search Console request failed: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {
            "success": True,
            "data": [
                {
                    "id": row.id,
                    "keyword": row.keyword,
                    "position": row.position,
                    "clicks": row.clicks,
                    "impressions": row.impressions,
                    "ctr": row.ctr,
                }
                for row in rows
            ],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recommendations(request):
    try:
        rows, snapshot = get_ai_recommendations(request.user)
    except AnalyticsConfigError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        return Response(
            {"detail": f"AI recommendation generation failed: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {
            "success": True,
            "count": len(rows),
            "snapshot": snapshot,
            "data": [
                {
                    "id": row.id,
                    "priority": row.priority,
                    "icon": row.icon,
                    "title": row.title,
                    "desc": row.desc,
                    "action": row.action,
                }
                for row in rows
            ],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def top_pages(request):
    return Response(
        {
            "results": [
                {
                    "url": row.url,
                    "clicks": row.clicks,
                    "position": row.position,
                    "metaDescription": row.meta_description,
                }
                for row in get_top_pages_data()
            ]
        }
    )
