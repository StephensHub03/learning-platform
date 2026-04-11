"""URL routes for certificates app."""
from django.urls import path
from .views import CertificateListView, CertificateDownloadView, CertificateVerifyView

urlpatterns = [
    path('', CertificateListView.as_view(), name='certificate-list'),
    path('<uuid:certificate_id>/download/', CertificateDownloadView.as_view(), name='certificate-download'),
    path('verify/<uuid:certificate_id>/', CertificateVerifyView.as_view(), name='certificate-verify'),
]
