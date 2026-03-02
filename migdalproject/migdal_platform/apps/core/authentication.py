from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import DataSource
import uuid

class AnsibleApiKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # 1. Get the Header
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        # --- DEBUG PRINTS (Remove later) ---
        print(f"DEBUG: Received Header: {auth_header}")
        # -----------------------------------

        if not auth_header:
            return None  # No header found

        try:
            # 2. Split "Api-Key <UUID>"
            prefix, key = auth_header.split()
            
            # --- DEBUG PRINTS ---
            print(f"DEBUG: Prefix: '{prefix}' | Key: '{key}'")
            # --------------------

            if prefix != 'Api-Key':
                print("DEBUG: Prefix does not match 'Api-Key'")
                return None

            # 3. Find Device
            device = DataSource.objects.get(id=key)
            
            print(f"DEBUG: Success! Found device: {device.name}")
            return (device, None) # Auth Successful!

        except ValueError:
            print("DEBUG: Header format error (cannot split)")
            return None
        except DataSource.DoesNotExist:
            print(f"DEBUG: Device not found for UUID: {key}")
            # Check if it exists in DB at all to see if it's a mismatch
            all_ids = list(DataSource.objects.values_list('id', flat=True))
            print(f"DEBUG: Available IDs in DB: {all_ids}")
            return None
        except Exception as e:
            print(f"DEBUG: Unexpected Error: {e}")
            return None