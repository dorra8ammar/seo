from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from django.views.generic import TemplateView


def api_not_found(request, path=""):
    return JsonResponse(
        {
            "message": "Route introuvable",
            "path": request.path,
        },
        status=404,
    )

urlpatterns = [
    path("admin/", admin.site.urls),
    path('api/accounts/', include('accounts.urls')),

    # Auth APIs
    path("api/auth/", include("accounts.urls")),

    # Other apps
    path("api/analytics/", include("analytics_app.urls")),
    path("api/contact/", include("contact_app.urls")),
    path("api/", api_not_found),
    path("api/<path:path>", api_not_found),
    path("", TemplateView.as_view(template_name="index.html")),
    path("<path:path>", TemplateView.as_view(template_name="index.html")),
]
