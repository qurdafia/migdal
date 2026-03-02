from django.db import models
from apps.accounts.models import Organization
import uuid

class DataSource(models.Model):
    """
    Represents a Source of data (e.g., 'Core-Switch-01').
    It belongs to a Tenant (Organization).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='datasources')
    
    name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=100) # e.g. 'network', 'storage', 'vm'
    
    # This is the "Password" for the Device (API Key)
    api_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

class MetricDefinition(models.Model):
    """
    Maps a raw JSON field to a Dashboard Widget.
    """
    source = models.ForeignKey(DataSource, related_name='metrics', on_delete=models.CASCADE)
    
    # Visual Labels
    label = models.CharField(max_length=100)  # e.g., "CPU Load"
    unit = models.CharField(max_length=50, blank=True) # e.g., "%"
    
    # The Map: Where is the data? e.g., "$.system.stats.cpu"
    json_path = models.CharField(max_length=255)
    
    # The Visual Logic: { "critical": 90, "warning": 75 }
    # threshold_config = models.JSONField(default=dict, blank=True)

    # --- NEW FIELDS FOR THRESHOLDS ---
    threshold_warning = models.FloatField(null=True, blank=True, help_text="Alert if value exceeds this")
    threshold_critical = models.FloatField(null=True, blank=True, help_text="Critical alert if value exceeds this")

    def __str__(self):
        return f"{self.label} for {self.source.name}"

class TelemetryRecord(models.Model):
    """
    The Raw History. We store the full JSON so we can re-analyze it later.
    """
    source = models.ForeignKey(DataSource, related_name='telemetry', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    payload = models.JSONField()
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['source', 'timestamp']),
        ]

    def __str__(self):
        return f"Data from {self.source.name} at {self.timestamp}"