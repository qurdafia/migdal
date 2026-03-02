from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AIProvider, PromptTemplate
from .services import AIAnalysisService # We will update this next

class AIConfigurationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        provider = AIProvider.objects.filter(organization=org, is_active=True).first()
        prompt = PromptTemplate.objects.filter(organization=org, is_default=True).first()
        
        return Response({
            "provider_type": provider.provider_type if provider else "gemini",
            "model_name": provider.model_name if provider else "gemini-1.5-flash",
            "api_key_masked": f"****{provider.api_key[-4:]}" if (provider and provider.api_key) else "",
            # NEW: Return the API URL
            "api_url": provider.api_url if provider else "", 
            "system_prompt": prompt.template_text if prompt else "Analyze this telemetry..."
        })

    def post(self, request):
        org = request.user.organization
        data = request.data
        
        provider, _ = AIProvider.objects.get_or_create(
            organization=org,
            defaults={'name': 'Default Provider', 'is_active': True}
        )
        
        provider.provider_type = data.get('provider_type', 'gemini')
        provider.model_name = data.get('model_name', 'gemini-1.5-flash')
        
        # NEW: Save the API URL
        if 'api_url' in data:
            provider.api_url = data['api_url']

        new_key = data.get('api_key')
        if new_key and '****' not in new_key:
            provider.api_key = new_key
            
        provider.is_active = True
        provider.save()

        # Update Prompt (Same as before)
        prompt, _ = PromptTemplate.objects.get_or_create(
            organization=org,
            defaults={'name': 'Default Persona', 'is_default': True}
        )
        if 'system_prompt' in data:
            prompt.template_text = data['system_prompt']
        prompt.is_default = True
        prompt.save()

        return Response({"status": "Configuration Saved"})

# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework.permissions import IsAuthenticated
# from rest_framework import status
# from .services import AIAnalysisService

class TriggerAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, source_id):
        # 1. Initialize Service
        service = AIAnalysisService()
        
        # 2. Run Analysis
        result = service.analyze_device(source_id)
        
        # 3. Return Result
        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(result, status=status.HTTP_200_OK)