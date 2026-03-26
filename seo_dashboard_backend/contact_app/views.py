from django.conf import settings
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ContactMessageSerializer


class ContactView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()

        try:
            send_mail(
                subject=f"[SEOmind] {contact.sujet}",
                message=f"De: {contact.nom} ({contact.email})\n\n{contact.message}",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", contact.email),
                recipient_list=[getattr(settings, "EMAIL_HOST_USER", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "")],
                fail_silently=False,
            )
        except Exception:
            # Contact message remains saved even if email notification fails.
            pass

        return Response({"message": "Message envoye avec succes."}, status=status.HTTP_201_CREATED)

