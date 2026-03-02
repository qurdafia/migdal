from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid
from django.utils import timezone

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    tier = models.CharField(max_length=20, default='trial') 
    max_devices = models.IntegerField(default=5)
    license_expiry = models.DateTimeField(null=True, blank=True)
    license_key = models.TextField(blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.name

    @property
    def is_license_valid(self):
        return not (self.license_expiry and self.license_expiry < timezone.now())

class User(AbstractUser):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='users', null=True)
    role = models.CharField(max_length=20, default='admin')
    class Meta:
        db_table = 'migdal_users'