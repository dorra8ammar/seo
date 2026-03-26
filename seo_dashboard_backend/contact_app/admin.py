from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("nom", "email", "sujet", "created_at")
    search_fields = ("nom", "email", "sujet", "message")
    ordering = ("-created_at",)

