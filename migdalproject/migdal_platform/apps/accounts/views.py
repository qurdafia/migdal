from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
import datetime
import logging
from .utils import verify_license_payload

from apps.core.models import DataSource
from .models import Organization

from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token


from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .serializers import OrganizationSerializer

logger = logging.getLogger(__name__)

class ActivateLicenseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        license_string = request.data.get('license_key')
        if not license_string:
            return Response({"error": "Missing license_key"}, status=400)
        
        try:
            # 1. Verify Cryptography (Kept your util check for early failing)
            data = verify_license_payload(license_string)
            
            # 2. Check User Organization
            org = request.user.organization
            if not org:
                return Response({"error": "User has no organization"}, status=400)
            
            # 3. Check Name Match (Case Insensitive)
            if data.get('org_name', '').lower() != org.name.lower():
                return Response({"error": "License Organization Mismatch"}, status=400)

            # 4. Apply Upgrades (Zero-Trust Logic!)
            # We ONLY save the key. The model's @property methods instantly update 
            # org.tier, org.max_devices, and org.license_expiry dynamically!
            org.license_key = license_string
            org.save()
            
            logger.info(f"License activated for {org.name} (Tier: {org.tier})")
            
            return Response({
                "status": "success",
                "tier": org.tier,
                "expiry": org.license_expiry
            })

        except Exception as e:
            logger.error(f"License Activation Failed: {str(e)}")
            return Response({"error": "Invalid License or Server Error"}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class CustomLoginView(ObtainAuthToken):
    """
    Returns the Auth Token AND the Organization Name.
    React needs both to work correctly.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # 1. Validate Username/Password
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # 2. Get or Create Token
        token, created = Token.objects.get_or_create(user=user)
        
        # 3. Return Custom Response
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            # Handle case where superuser has no organization
            'organization': user.organization.name if user.organization else "System Admin" 
        })


class LicenseStatusView(APIView):
    """
    Returns details about the current license using the User's Organization.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        
        # Safety check: User might be a superuser with no org
        if not org:
            return Response({"status": "No Organization", "max_nodes": 0, "used_nodes": 0})

        # Count currently active devices
        used_nodes = DataSource.objects.filter(organization=org, active=True).count()
        
        # Calculate validity
        is_active = org.is_license_valid # Uses the @property from your model
        status_text = "Active" if is_active else "Expired"
        
        # Handle cases where key might be empty (e.g. trial)
        key_preview = "****"
        if org.license_key and len(org.license_key) > 4:
            key_preview = f"****-****-{org.license_key[-4:]}"

        return Response({
            "status": status_text,
            "organization": org.name,
            "type": org.tier.title(),      # e.g. "Trial" or "Enterprise"
            "max_nodes": org.max_devices,  # From your model
            "used_nodes": used_nodes,
            "expiry_date": org.license_expiry,
            "key_preview": key_preview
        })


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 🛡️ Superusers see all orgs, regular users only see their own
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.all().order_by('name')
        if user.organization:
            return Organization.objects.filter(id=user.organization.id).order_by('name')
        return Organization.objects.none()