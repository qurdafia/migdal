from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/core/', include('apps.core.urls')),
    path('api/ai/', include('apps.ai_engine.urls')),
    path('api/reports/', include('apps.reports.urls')),
]