from rest_framework import serializers
from .models import DataSource, TelemetryRecord, MetricDefinition

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

    class Meta:
        model = DataSource
        # 2. USE THE REAL DATABASE FIELD NAME ('device_type')
        fields = [
            'id', 'name', 'type', 'active', 'status', 
            'organization', 'created_at', 
            'last_seen', 'ip_address', 'latest_snapshot'
        ]
        extra_kwargs = {
            'organization': {
                #'write_only': True,
                'read_only' : True,
            }
        }

    # # 3. INTERCEPT OUTPUT: Rename 'device_type' -> 'type' for Frontend
    # def to_representation(self, instance):
    #     data = super().to_representation(instance)
    #     data['type'] = data['device_type'] # Add 'type' for React
    #     return data

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

        
# class DataSourceSerializer(serializers.ModelSerializer):
#     # Calculated Fields
#     type = serializers.CharField(source='device_type')
#     latest_snapshot = serializers.SerializerMethodField()
#     last_seen = serializers.SerializerMethodField()
#     ip_address = serializers.SerializerMethodField()
#     status = serializers.SerializerMethodField()

#     class Meta:
#         model = DataSource
#         fields = [
#             'id', 'name', 'type', 'active', 'status', 
#             'organization', 'created_at', 
#             'last_seen', 'ip_address', 'latest_snapshot'
#         ]
#         extra_kwargs = {
#             'organization': {'write_only': True}
#         }

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


# from rest_framework import serializers
# from .models import DataSource, TelemetryRecord, MetricDefinition

# class MetricDefinitionSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = MetricDefinition
#         fields = '__all__'

# class TelemetryRecordSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = TelemetryRecord
#         fields = '__all__'

# class DataSourceSerializer(serializers.ModelSerializer):
#     # --- CALCULATED FIELDS (Frontend needs these, but DB doesn't have them) ---
    
#     # 1. Map DB 'device_type' -> Frontend 'type'
#     type = serializers.CharField(source='device_type')
    
#     # 2. Get the full JSON payload of the last ping
#     latest_snapshot = serializers.SerializerMethodField()
    
#     # 3. Calculate 'last_seen' from the latest telemetry timestamp
#     last_seen = serializers.SerializerMethodField()
    
#     # 4. Find an IP address inside the telemetry (since DataSource model has no IP field)
#     ip_address = serializers.SerializerMethodField()
    
#     # 5. Simple status check
#     status = serializers.SerializerMethodField()

#     class Meta:
#         model = DataSource
#         # We explicitly map the fields so React gets exactly what it expects
#         fields = [
#             'id', 'name', 'type', 'active', 'status', 
#             'organization', 'created_at', 
#             'last_seen', 'ip_address', 'latest_snapshot'
#         ]
#         extra_kwargs = {
#             'organization': {'write_only': True} # Secure the Org ID
#         }

#     def get_latest_snapshot(self, obj):
#         # Your model defines related_name='telemetry', so this works:
#         record = obj.telemetry.first() # Meta ordering is -timestamp
#         return record.payload if record else {}

#     def get_last_seen(self, obj):
#         record = obj.telemetry.first()
#         return record.timestamp if record else None

#     def get_ip_address(self, obj):
#         """
#         Since DataSource has no IP field, we try to find it in the latest telemetry.
#         """
#         record = obj.telemetry.first()
#         if record and record.payload:
#             # Try common keys where an IP might be hidden
#             return (
#                 record.payload.get('ip_address') or 
#                 record.payload.get('host_ip') or 
#                 record.payload.get('ip') or 
#                 "N/A"
#             )
#         return "N/A"

#     def get_status(self, obj):
#         return "active" if obj.active else "inactive"



# # from rest_framework import serializers
# # from .models import DataSource, TelemetryRecord

# # class DataSourceSerializer(serializers.ModelSerializer):
# #     # New Field: Get the single most recent telemetry record
# #     latest_snapshot = serializers.SerializerMethodField()

# #     class Meta:
# #         model = DataSource
# #         fields = '__all__' # Includes id, name, type, ip_address, etc.

# #     def get_latest_snapshot(self, obj):
# #         # Fetch the newest record
# #         record = obj.telemetry.order_by('-timestamp').first()
# #         if record:
# #             return record.payload # Returns the raw JSON (e.g. {"cpu": 90})
# #         return None