from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.utils import timezone


def health_check(request):
    """Simple health check endpoint to keep Render alive"""
    return JsonResponse({
        "status": "healthy",
        "timestamp": timezone.now().isoformat(),
        "message": "Server is running"
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/leaves/', include('leaves.urls')),

    # Health check for keep-alive ping
    path('health/', health_check, name='health-check'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
