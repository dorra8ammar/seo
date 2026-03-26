import json
import re
from urllib.error import URLError
from urllib.parse import urlencode, urlparse
from urllib.request import urlopen

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes
from django.utils.encoding import force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .google_oauth import (
    GoogleOAuthError,
    build_google_oauth_url,
    disconnect_google_connection,
    exchange_google_code,
    fetch_google_userinfo,
    get_google_connection_summary,
    load_signed_oauth_state,
    save_google_selection,
    store_google_tokens,
)
from .models import User
from .serializers import (
    EmailTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
)


def _unique_username(seed: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]+", "", (seed or "user").strip().replace(" ", "_"))
    cleaned = cleaned[:150] or "user"
    username = cleaned
    suffix = 1
    while User.objects.filter(username=username).exists():
        token = f"_{suffix}"
        username = f"{cleaned[:150-len(token)]}{token}"
        suffix += 1
    return username


def _verify_google_token(id_token: str) -> dict:
    query = urlencode({"id_token": id_token})
    verify_url = f"https://oauth2.googleapis.com/tokeninfo?{query}"
    try:
        with urlopen(verify_url, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except URLError as exc:
        raise ValueError(f"Google verification unavailable: {exc}") from exc

    if payload.get("email_verified") not in (True, "true"):
        raise ValueError("Google email is not verified.")

    expected_aud = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if expected_aud and payload.get("aud") != expected_aud:
        raise ValueError("Google client_id mismatch.")

    email = str(payload.get("email", "")).strip().lower()
    if not email:
        raise ValueError("No email returned by Google.")

    return payload


def _send_account_activated_email(user: User) -> None:
    html_content = f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#2f49f5;color:#ffffff;padding:30px;border-radius:12px;">
            <h1 style="margin:0 0 14px;font-size:38px;line-height:1.1;">Compte active</h1>
            <p style="margin:0 0 16px;font-size:16px;">{user.email}</p>
            <p style="margin:0 0 18px;font-size:20px;line-height:1.4;">
                Le super user a active votre compte SEOmind. Vous pouvez maintenant vous connecter.
            </p>
        </div>
    """
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject="SEOmind - Votre compte est active",
        body=text_content,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@seomind.local"),
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(
        {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "is_superuser": request.user.is_superuser,
            "google_connected": bool(getattr(request.user, "google_connection", None) and request.user.google_connection.refresh_token),
            "ga4_property_id": getattr(getattr(request.user, "google_connection", None), "ga4_property_id", ""),
            "search_console_site_url": getattr(getattr(request.user, "google_connection", None), "search_console_site_url", ""),
        }
    )


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = str(request.data.get("id_token", "")).strip()
        if not id_token:
            return Response({"detail": "Field 'id_token' is required."}, status=400)

        try:
            google_data = _verify_google_token(id_token)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        email = str(google_data.get("email", "")).strip().lower()
        first_name = str(google_data.get("given_name", "")).strip()
        last_name = str(google_data.get("family_name", "")).strip()
        name_seed = str(google_data.get("name", "")).strip() or email.split("@")[0]

        user = User.objects.filter(email=email).first()
        if user is None:
            user = User(
                email=email,
                username=_unique_username(name_seed),
                first_name=first_name,
                last_name=last_name,
                is_active=True,
            )
            user.save()
        elif not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_oauth_url(request):
    origin = request.headers.get("Origin", "").strip()
    if not origin:
        referer = request.headers.get("Referer", "").strip()
        if referer:
            parsed = urlparse(referer)
            origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""
    if not origin:
        origin = getattr(settings, "FRONTEND_BASE_URL", "")
    try:
        auth_url = build_google_oauth_url(request.user, origin)
    except GoogleOAuthError as exc:
        return Response({"detail": str(exc)}, status=503)
    return Response({"authUrl": auth_url})


class GoogleOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = str(request.query_params.get("code", "")).strip()
        state = str(request.query_params.get("state", "")).strip()
        error = str(request.query_params.get("error", "")).strip()

        if error:
            return _oauth_popup_response(False, "Google authorization was cancelled.")
        if not code or not state:
            return _oauth_popup_response(False, "Missing Google OAuth code or state.")

        try:
            payload = load_signed_oauth_state(state)
            user = get_object_or_404(User, pk=payload["user_id"])
            token_data = exchange_google_code(code)
            userinfo = fetch_google_userinfo(token_data.get("access_token", ""))
            store_google_tokens(user, token_data, userinfo)
        except GoogleOAuthError as exc:
            return _oauth_popup_response(False, str(exc))
        except Exception as exc:
            return _oauth_popup_response(False, f"Unexpected Google OAuth error: {exc}")

        origin = payload.get("origin") or "*"
        return _oauth_popup_response(True, "Google account connected successfully.", origin=origin)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_connection_status(request):
    try:
        return Response(get_google_connection_summary(request.user))
    except GoogleOAuthError as exc:
        return Response({"detail": str(exc)}, status=503)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def google_connection_select(request):
    property_id = str(request.data.get("propertyId", "")).strip()
    site_url = str(request.data.get("siteUrl", "")).strip()
    if not property_id or not site_url:
        return Response({"detail": "propertyId and siteUrl are required."}, status=400)

    try:
        save_google_selection(request.user, property_id, site_url)
        summary = get_google_connection_summary(request.user)
    except GoogleOAuthError as exc:
        return Response({"detail": str(exc)}, status=400)

    return Response(summary)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def google_connection_disconnect_view(request):
    disconnect_google_connection(request.user)
    return Response({"success": True})


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user and default_token_generator.check_token(user, token):
            user.is_active = True
            user.save(update_fields=["is_active"])
            return HttpResponse("Email verifie avec succes. Vous pouvez vous connecter.")

        return HttpResponse("Lien de verification invalide ou expire.", status=400)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        user = User.objects.filter(email=email).first()

        if user and user.is_active:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_base_url = getattr(settings, "FRONTEND_BASE_URL", "http://127.0.0.1:5173").rstrip("/")
            reset_link = f"{frontend_base_url}/reset-password/{uid}/{token}"

            html_content = f"""
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#2f49f5;color:#ffffff;padding:30px;border-radius:12px;">
                    <h1 style="margin:0 0 14px;font-size:34px;line-height:1.1;">Reinitialisation du mot de passe</h1>
                    <p style="margin:0 0 18px;font-size:16px;">Bonjour,</p>
                    <p style="margin:0 0 18px;font-size:18px;line-height:1.5;">
                        Cliquez sur le bouton ci-dessous pour definir un nouveau mot de passe.
                    </p>
                    <p style="margin:24px 0;">
                        <a href="{reset_link}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#ffffff;color:#2f49f5;font-weight:700;text-decoration:none;">
                            Reinitialiser le mot de passe
                        </a>
                    </p>
                    <p style="margin:0;font-size:13px;opacity:.9;">Si vous n'avez pas demande ce changement, ignorez cet email.</p>
                </div>
            """
            text_content = strip_tags(html_content)

            email_message = EmailMultiAlternatives(
                subject="SEOmind - Reinitialisation du mot de passe",
                body=text_content,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@seomind.local"),
                to=[user.email],
            )
            email_message.attach_alternative(html_content, "text/html")
            email_message.send(fail_silently=False)

        return Response(
            {
                "detail": "Si cette adresse email existe, un lien de reinitialisation a ete envoye."
            }
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])

        return Response({"detail": "Mot de passe mis a jour avec succes."})


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = User.objects.all().order_by("-date_joined")
        email_query = self.request.query_params.get("email", "").strip()
        if email_query:
            queryset = queryset.filter(email__icontains=email_query)
        return queryset

    def partial_update(self, request, *args, **kwargs):
        # Superuser panel changes activation state only.
        if "is_active" not in request.data:
            return Response({"detail": "Field 'is_active' is required."}, status=400)

        instance = self.get_object()
        was_active = instance.is_active
        value = request.data.get("is_active")
        is_active = str(value).lower() in {"1", "true", "yes", "on"}
        instance.is_active = is_active
        instance.save(update_fields=["is_active"])

        if not was_active and is_active:
            try:
                _send_account_activated_email(instance)
            except Exception:
                # Keep activation successful even if SMTP has a transient issue.
                pass

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        required_fields = ["email", "username", "password"]
        missing = [field for field in required_fields if not request.data.get(field)]
        if missing:
            return Response({"detail": f"Missing required fields: {', '.join(missing)}"}, status=400)

        email = str(request.data.get("email")).strip().lower()
        username = str(request.data.get("username")).strip()

        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email already exists."}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already exists."}, status=400)

        user = User(
            email=email,
            username=username,
            first_name=str(request.data.get("first_name", "")).strip(),
            last_name=str(request.data.get("last_name", "")).strip(),
            is_active=str(request.data.get("is_active", "true")).lower() in {"1", "true", "yes", "on"},
        )
        user.set_password(str(request.data.get("password")))
        user.save()

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=201)


def _oauth_popup_response(success: bool, message: str, origin: str = "*"):
    safe_message = json.dumps(message)
    safe_origin = json.dumps(origin or "*")
    event_type = "google-oauth-success" if success else "google-oauth-error"
    html = f"""
<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;padding:24px">
    <p>{message}</p>
    <script>
      (function() {{
        var payload = {{ type: "{event_type}", message: {safe_message} }};
        var targetOrigin = {safe_origin};
        if (window.opener) {{
          window.opener.postMessage(payload, targetOrigin === "*" ? "*" : targetOrigin);
        }}
        window.close();
      }})();
    </script>
  </body>
</html>
"""
    return HttpResponse(html)
