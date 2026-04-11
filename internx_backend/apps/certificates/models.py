"""
Certificate model with PDF storage and QR code verification.
"""
import uuid
from django.db import models
from apps.users.models import User
from apps.courses.models import Course
from apps.results.models import Result


class Certificate(models.Model):
    """PDF certificate issued to a student upon course completion."""

    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='certificates'
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='certificates'
    )
    result = models.OneToOneField(
        Result, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='certificate'
    )
    # Unique certificate ID for QR verification
    certificate_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    pdf_file = models.FileField(upload_to='certificates/', null=True, blank=True)
    qr_code = models.ImageField(upload_to='certificate_qr/', null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    is_emailed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student', 'course')
        ordering = ['-issued_at']

    def __str__(self):
        return f'Certificate – {self.student.get_full_name()} – {self.course.title}'

    @property
    def verification_url(self):
        from django.conf import settings
        return f'{settings.FRONTEND_URL}/verify-certificate/{self.certificate_id}'
