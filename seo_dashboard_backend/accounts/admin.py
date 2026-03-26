from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, UserGoogleConnection


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    ordering = ("-date_joined",)
    list_display = ("id", "email", "username", "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff", "is_superuser")
    search_fields = ("email", "username", "first_name", "last_name")

    fieldsets = UserAdmin.fieldsets + (
        ("SEOmind", {"fields": ()}),
    )


@admin.register(UserGoogleConnection)
class UserGoogleConnectionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "google_email", "ga4_property_id", "search_console_site_url", "updated_at")
    search_fields = ("user__email", "google_email", "ga4_property_id", "search_console_site_url")
