from django.urls import path, include
from .views import ActivateLicenseView, CustomLoginView, LicenseStatusView, OrganizationViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
# This creates the /organizations/ endpoint automatically!
router.register(r'organizations', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('', include(router.urls)),
    path('activate/', ActivateLicenseView.as_view(), name='activate_license'),
    path('login/', CustomLoginView.as_view(), name='api_login'),
    path('status/', LicenseStatusView.as_view(), name='license_status'),
]