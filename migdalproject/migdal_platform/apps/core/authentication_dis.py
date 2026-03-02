from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import DataSource

class AnsibleApiKeyAuthentication(BaseAuthentication):
    """
    1. Checks if the request has a valid X-Migdal-Source-Key.
    2. Checks if the Organization License is active.
    """
    def authenticate(self, request):
        api_key = request.headers.get('X-Migdal-Source-Key')
        if not api_key:
            return None # Pass to next auth method

        try:
            source = DataSource.objects.get(api_key=api_key)
        except DataSource.DoesNotExist:
            raise AuthenticationFailed('Invalid Source API Key')

        # --- LICENSE ENFORCEMENT ---
        # If the subscription is dead, we reject the data here.
        if not source.organization.is_license_valid:
            raise AuthenticationFailed('License Expired. Ingestion Blocked.')

        return (None, source)