from django.db import models


class ContactMessage(models.Model):
    nom = models.CharField(max_length=100)
    email = models.EmailField(max_length=150)
    sujet = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.nom} - {self.sujet}"

