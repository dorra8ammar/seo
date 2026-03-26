import re

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, UserGoogleConnection


def _generate_unique_username(base_value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]+", "", (base_value or "user").strip().replace(" ", "_"))
    cleaned = cleaned[:150] or "user"
    username = cleaned
    suffix = 1
    while User.objects.filter(username=username).exists():
        token = f"_{suffix}"
        username = f"{cleaned[:150-len(token)]}{token}"
        suffix += 1
    return username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password", "password2", "first_name", "last_name")
        extra_kwargs = {
            "username": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        username = str(validated_data.pop("username", "")).strip()
        email = str(validated_data.get("email", "")).strip().lower()
        if email:
            validated_data["email"] = email

        if not username:
            first_name = str(validated_data.get("first_name", "")).strip()
            last_name = str(validated_data.get("last_name", "")).strip()
            seed = "_".join(part for part in [first_name, last_name] if part) or (email.split("@")[0] if email else "user")
            username = _generate_unique_username(seed)
        elif User.objects.filter(username=username).exists():
            username = _generate_unique_username(username)

        user = User(username=username, **validated_data)
        user.set_password(password)
        user.is_active = False
        user.save()

        try:
            html_content = f"""
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#2f49f5;color:#ffffff;padding:30px;border-radius:12px;">
                    <h1 style="margin:0 0 14px;font-size:38px;line-height:1.1;">Compte cree avec succes</h1>
                    <p style="margin:0 0 16px;font-size:16px;">{user.email}</p>
                    <p style="margin:0 0 18px;font-size:20px;line-height:1.4;">
                        Votre compte est en attente d'activation par le super user.
                    </p>
                    <p style="margin:18px 0 0;font-size:13px;opacity:.9;">
                        Vous recevrez un second e-mail des que votre compte sera active.
                    </p>
                </div>
            """
            text_content = strip_tags(html_content)

            email = EmailMultiAlternatives(
                subject="SEOmind - Compte en attente d'activation",
                body=text_content,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@seomind.local"),
                to=[user.email],
            )
            email.attach_alternative(html_content, "text/html")
            email.send(fail_silently=False)
        except Exception as exc:
            user.delete()
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Envoi email impossible. Configure EMAIL_HOST_USER et "
                        "EMAIL_HOST_PASSWORD (mot de passe d'application Gmail). "
                        f"Erreur: {exc}"
                    )
                }
            )

        return user


class UserSerializer(serializers.ModelSerializer):
    google_connected = serializers.SerializerMethodField()
    ga4_property_id = serializers.SerializerMethodField()
    search_console_site_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "google_connected",
            "ga4_property_id",
            "search_console_site_url",
        )

    def get_google_connected(self, obj):
        connection = getattr(obj, "google_connection", None)
        return bool(connection and connection.refresh_token)

    def get_ga4_property_id(self, obj):
        connection = getattr(obj, "google_connection", None)
        return connection.ga4_property_id if connection else ""

    def get_search_console_site_url(self, obj):
        connection = getattr(obj, "google_connection", None)
        return connection.search_console_site_url if connection else ""


class UserGoogleConnectionSerializer(serializers.ModelSerializer):
    connected = serializers.SerializerMethodField()
    googleEmail = serializers.CharField(source="google_email")
    selectedPropertyId = serializers.CharField(source="ga4_property_id")
    selectedPropertyName = serializers.CharField(source="ga4_property_name")
    selectedSiteUrl = serializers.CharField(source="search_console_site_url")

    class Meta:
        model = UserGoogleConnection
        fields = (
            "connected",
            "googleEmail",
            "selectedPropertyId",
            "selectedPropertyName",
            "selectedSiteUrl",
        )

    def get_connected(self, obj):
        return bool(obj.refresh_token)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        validate_password(attrs["password"])

        try:
            uid = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"detail": "Lien de reinitialisation invalide."})

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"detail": "Lien de reinitialisation invalide ou expire."})

        attrs["user"] = user
        return attrs
