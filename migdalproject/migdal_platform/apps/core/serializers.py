from rest_framework import serializers
from .models import DataSource, TelemetryRecord, MetricDefinition, EmailConfiguration, DeviceGroup
from apps.ai_engine.models import AnalysisReport

class MetricDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricDefinition
        fields = '__all__'
        # --- FIX: Prevent 400 Error by making 'source' read-only ---
        read_only_fields = ['source'] 

class TelemetryRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelemetryRecord
        fields = '__all__'

class DataSourceSerializer(serializers.ModelSerializer):
    # 1. READ-ONLY Calculated Fields
    type = serializers.CharField(source='device_type')
    latest_snapshot = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    # 🛡️ Renamed this so the React GUI can still see the telemetry IP 
    # without blocking the engineer from saving a static IP for automation.
    reported_ip = serializers.SerializerMethodField()
    
    # --- NEW AI FIELDS ---
    smart_health = serializers.SerializerMethodField()
    ai_summary = serializers.SerializerMethodField()

    class Meta:
        model = DataSource
        fields = [
            'id', 'name', 'type', 'active', 'status', 
            'organization', 'created_at', 
            'last_seen', 'latest_snapshot',
            'smart_health', 'ai_summary',
            
            # 👇 NEW: The writable physical database fields for Automation
            'ip_address', 'hostname', 
            
            # 👇 NEW: The read-only telemetry fallback
            'reported_ip' 
        ]
        extra_kwargs = {
            'organization': {
                'read_only' : True,
            }
        }

    def get_latest_snapshot(self, obj):
        if hasattr(obj, 'telemetry'):
            record = obj.telemetry.first()
        else:
            record = obj.telemetryrecord_set.first()
        return record.payload if record else {}

    def get_last_seen(self, obj):
        if hasattr(obj, 'telemetry'):
            record = obj.telemetry.first()
        else:
            record = obj.telemetryrecord_set.first()
        return record.timestamp if record else None

    # 👇 Renamed from get_ip_address to get_reported_ip
    def get_reported_ip(self, obj):
        if hasattr(obj, 'telemetry'):
            record = obj.telemetry.first()
        else:
            record = obj.telemetryrecord_set.first()
        
        if record and record.payload:
            return (
                record.payload.get('ip_address') or 
                record.payload.get('host_ip') or 
                record.payload.get('ip') or 
                "N/A"
            )
        return "N/A"

    def get_status(self, obj):
        return "active" if obj.active else "inactive"

    # ==========================================
    # AI-DRIVEN METHODS
    # ==========================================
    def get_smart_health(self, obj):
        latest_report = AnalysisReport.objects.filter(source=obj).order_by('-created_at').first()
        if latest_report and latest_report.is_anomaly:
            return "CRITICAL"
        
        if hasattr(obj, 'telemetry'):
            record = obj.telemetry.first()
        else:
            record = obj.telemetryrecord_set.first()
            
        if record and record.payload:
            return str(record.payload.get('health', 'HEALTHY')).upper()
            
        return "UNKNOWN"

    def get_ai_summary(self, obj):
        latest_report = AnalysisReport.objects.filter(source=obj).order_by('-created_at').first()
        if latest_report:
            return latest_report.content
        return "No AI analysis available yet."


class DeviceGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceGroup
        fields = ['id', 'organization', 'name', 'description', 'devices', 'created_at']        


class EmailConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailConfiguration
        fields = '__all__'


