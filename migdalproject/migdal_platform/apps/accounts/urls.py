from django.urls import path
from .views import ActivateLicenseView, CustomLoginView, LicenseStatusView

urlpatterns = [
    path('activate/', ActivateLicenseView.as_view(), name='activate_license'),
    path('login/', CustomLoginView.as_view(), name='api_login'),
    path('status/', LicenseStatusView.as_view(), name='license_status'),
]