from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CredentialViewSet, ExecutionEnvironmentViewSet, 
    PlaybookViewSet, AutomationJobViewSet, JobRunViewSet
)

router = DefaultRouter()
router.register(r'credentials', CredentialViewSet)
router.register(r'environments', ExecutionEnvironmentViewSet)
router.register(r'playbooks', PlaybookViewSet)
router.register(r'jobs', AutomationJobViewSet)
router.register(r'runs', JobRunViewSet, basename='jobrun')

urlpatterns = [
    path('', include(router.urls)),
]