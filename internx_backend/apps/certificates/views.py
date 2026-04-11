"""
Certificate views.
- GET /api/certificates/ — list student's certificates
- GET /api/certificates/{uuid}/download/ — serve PDF
- GET /api/certificates/verify/{uuid}/ — public QR verification
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from .models import Certificate
from .serializers import CertificateSerializer


class CertificateListView(generics.ListAPIView):
    """GET /api/certificates/ — List user's certificates."""

    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Certificate.objects.select_related('student', 'course').all()
        return Certificate.objects.select_related('course').filter(student=user)


class CertificateDownloadView(APIView):
    """GET /api/certificates/{uuid}/download/ — Download PDF."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, certificate_id):
        cert = get_object_or_404(Certificate, certificate_id=certificate_id)

        # Students can only download their own certificates
        if request.user.role == 'student' and cert.student != request.user:
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        if not cert.pdf_file:
            return Response(
                {'error': 'Certificate PDF not yet generated.'},
                status=status.HTTP_404_NOT_FOUND
            )

        response = FileResponse(
            cert.pdf_file.open('rb'),
            content_type='application/pdf'
        )
        response['Content-Disposition'] = (
            f'attachment; filename="InternX_Certificate_{certificate_id}.pdf"'
        )
        return response


class CertificateVerifyView(APIView):
    """GET /api/certificates/verify/{uuid}/ — Public QR verification endpoint."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, certificate_id):
        cert = get_object_or_404(Certificate, certificate_id=certificate_id)
        return Response({
            'valid': True,
            'student_name': cert.student.get_full_name(),
            'course_title': cert.course.title,
            'issued_at': cert.issued_at.strftime('%B %d, %Y'),
            'certificate_id': str(cert.certificate_id),
        })
