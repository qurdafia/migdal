from rest_framework import serializers
from .models import DataSource, TelemetryRecord, MetricDefinition, EmailConfiguration
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
    ip_address = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    # --- NEW AI FIELDS ---
    smart_health = serializers.SerializerMethodField()
    ai_summary = serializers.SerializerMethodField()

    class Meta:
        model = DataSource
        # 2. USE THE REAL DATABASE FIELD NAME ('device_type')
        fields = [
            'id', 'name', 'type', 'active', 'status', 
            'organization', 'created_at', 
            'last_seen', 'ip_address', 'latest_snapshot',
            'smart_health', 'ai_summary'  # <-- Added the new fields here!
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

    def get_ip_address(self, obj):
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
    # NEW AI-DRIVEN METHODS
    # ==========================================

    def get_smart_health(self, obj):
        """
        Determines health by asking the AI first. 
        If the AI detects an anomaly, it overrides the raw metrics.
        """
        # 1. Ask the AI Brain
        latest_report = AnalysisReport.objects.filter(source=obj).order_by('-created_at').first()
        if latest_report and latest_report.is_anomaly:
            return "CRITICAL"
        
        # 2. Fallback to the raw Ansible telemetry payload
        if hasattr(obj, 'telemetry'):
            record = obj.telemetry.first()
        else:
            record = obj.telemetryrecord_set.first()
            
        if record and record.payload:
            return str(record.payload.get('health', 'HEALTHY')).upper()
            
        return "UNKNOWN"

    def get_ai_summary(self, obj):
        """
        Attaches the most recent Gemini analysis text.
        """
        latest_report = AnalysisReport.objects.filter(source=obj).order_by('-created_at').first()
        if latest_report:
            return latest_report.content
        return "No AI analysis available yet."




# class DataSourceSerializer(serializers.ModelSerializer):
#     # 1. READ-ONLY Calculated Fields

#     type = serializers.CharField(source='device_type')

#     latest_snapshot = serializers.SerializerMethodField()
#     last_seen = serializers.SerializerMethodField()
#     ip_address = serializers.SerializerMethodField()
#     status = serializers.SerializerMethodField()

#     class Meta:
#         model = DataSource
#         # 2. USE THE REAL DATABASE FIELD NAME ('device_type')
#         fields = [
#             'id', 'name', 'type', 'active', 'status', 
#             'organization', 'created_at', 
#             'last_seen', 'ip_address', 'latest_snapshot'
#         ]
#         extra_kwargs = {
#             'organization': {
#                 #'write_only': True,
#                 'read_only' : True,
#             }
#         }

#     # # 3. INTERCEPT OUTPUT: Rename 'device_type' -> 'type' for Frontend
#     # def to_representation(self, instance):
#     #     data = super().to_representation(instance)
#     #     data['type'] = data['device_type'] # Add 'type' for React
#     #     return data

#     def get_latest_snapshot(self, obj):
#         if hasattr(obj, 'telemetry'):
#             record = obj.telemetry.first()
#         else:
#             record = obj.telemetryrecord_set.first()
#         return record.payload if record else {}

#     def get_last_seen(self, obj):
#         if hasattr(obj, 'telemetry'):
#             record = obj.telemetry.first()
#         else:
#             record = obj.telemetryrecord_set.first()
#         return record.timestamp if record else None

#     def get_ip_address(self, obj):
#         if hasattr(obj, 'telemetry'):
#             record = obj.telemetry.first()
#         else:
#             record = obj.telemetryrecord_set.first()
        
#         if record and record.payload:
#             return (
#                 record.payload.get('ip_address') or 
#                 record.payload.get('host_ip') or 
#                 record.payload.get('ip') or 
#                 "N/A"
#             )
#         return "N/A"

#     def get_status(self, obj):
#         return "active" if obj.active else "inactive"


class EmailConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailConfiguration
        fields = '__all__'


