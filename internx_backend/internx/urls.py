"""URL configuration for InternX project."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.sessions.views import GoogleCalendarCallbackView

urlpatterns = [
    path('', GoogleCalendarCallbackView.as_view(), name='google-calendar-root-callback'),
    path('admin/', admin.site.urls),

    # API Schema & Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # App routes
    path('api/auth/', include('apps.users.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/sessions/', include('apps.sessions.urls')),
    path('api/assignments/', include('apps.assignments.urls')),
    path('api/results/', include('apps.results.urls')),
    path('api/certificates/', include('apps.certificates.urls')),
    path('api/admin-panel/', include('apps.users.admin_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
