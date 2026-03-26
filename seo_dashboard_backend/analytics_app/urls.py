from django.urls import path

from .views import keywords, kpis, overview, recommendations, top_pages, traffic, traffic_sources, trends

urlpatterns = [
    path("overview/", overview),
    path("kpis/", kpis),
    path("keywords/", keywords),
    path("recommendations/", recommendations),
    path("traffic/", traffic),
    path("traffic/sources/", traffic_sources),
    path("trends/", trends),
    path("top-pages/", top_pages),
]
