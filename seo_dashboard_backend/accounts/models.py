from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]


class UserGoogleConnection(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="google_connection")
    google_email = models.EmailField(blank=True)
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)
    token_expiry = models.DateTimeField(null=True, blank=True)
    scopes = models.TextField(blank=True)
    ga4_property_id = models.CharField(max_length=64, blank=True)
    ga4_property_name = models.CharField(max_length=255, blank=True)
    search_console_site_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        label = self.google_email or self.user.email
        return f"Google connection for {label}"
