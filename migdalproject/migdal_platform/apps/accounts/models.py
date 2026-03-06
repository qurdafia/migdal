from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid
from django.utils import timezone
import datetime
import jwt # Make sure to import jwt!

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    license_key = models.TextField(blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    # ❌ WE DELETED THE PHYSICAL COLUMNS FOR TIER, MAX_DEVICES, AND EXPIRY!

    def __str__(self): return self.name

    @property
    def _decoded_license(self):
        """Helper property to safely decode the JWT on the fly."""
        if not self.license_key:
            return None
        try:
            # We read the public key and verify the signature in real-time
            with open("apps/accounts/public_key.pem", 'rb') as f:
                public_key = f.read()
            return jwt.decode(self.license_key, public_key, algorithms=["RS256"])
        except Exception:
            return None # If tampered with, it falls back to None

    @property
    def tier(self):
        """Dynamically reads the tier from the cryptographically secure JWT"""
        data = self._decoded_license
        return data.get('tier', 'trial') if data else 'trial'

    @property
    def max_devices(self):
        """Dynamically reads max devices. If tampered with, locks to 5!"""
        data = self._decoded_license
        return data.get('max_devices', 5) if data else 5

    @property
    def license_expiry(self):
        """Dynamically calculates the exact timezone-aware expiry date"""
        data = self._decoded_license
        if data and 'exp' in data:
            return datetime.datetime.fromtimestamp(data['exp'], tz=datetime.timezone.utc)
        return None

    @property
    def is_license_valid(self):
        expiry = self.license_expiry
        if not expiry:
            return False # Optional: Change to True if trial accounts don't expire
        return expiry > timezone.now()

class User(AbstractUser):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='users', null=True)
    role = models.CharField(max_length=20, default='admin')
    class Meta:
        db_table = 'migdal_users'