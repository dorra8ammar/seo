from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ForgotPasswordView,
    GoogleLoginView,
    GoogleOAuthCallbackView,
    LoginView,
    MeView,
    RegisterView,
    ResetPasswordView,
    UserViewSet,
    VerifyEmailView,
    google_connection_disconnect_view,
    google_connection_select,
    google_connection_status,
    google_oauth_url,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("verify-email/<str:uidb64>/<str:token>/", VerifyEmailView.as_view(), name="verify-email"),
    path("login/", LoginView.as_view(), name="login"),
    path("google-login/", GoogleLoginView.as_view(), name="google-login"),
    path("google/oauth/url/", google_oauth_url, name="google-oauth-url"),
    path("google/oauth/callback/", GoogleOAuthCallbackView.as_view(), name="google-oauth-callback"),
    path("google/connection/", google_connection_status, name="google-connection"),
    path("google/connection/select/", google_connection_select, name="google-connection-select"),
    path("google/connection/disconnect/", google_connection_disconnect_view, name="google-connection-disconnect"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("", include(router.urls)),
]
