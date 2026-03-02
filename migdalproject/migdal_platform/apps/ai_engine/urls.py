from django.urls import path
from .views import TriggerAnalysisView, AIConfigurationView # <--- Import the new View

urlpatterns = [
    # POST /api/ai/analyze/<uuid>/
    path('analyze/<uuid:source_id>/', TriggerAnalysisView.as_view(), name='trigger_analysis'),
    
    # GET/POST /api/ai/config/
    path('config/', AIConfigurationView.as_view(), name='ai_config'), # <--- New Endpoint
]