# apps/core/views.py
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication 

from .models import DataSource, TelemetryRecord, MetricDefinition, EmailConfiguration, DeviceGroup
from .serializers import DataSourceSerializer, TelemetryRecordSerializer, MetricDefinitionSerializer, EmailConfigurationSerializer, DeviceGroupSerializer
from .authentication import AnsibleApiKeyAuthentication

# --- THE NEW CONSOLIDATED NOTIFICATION IMPORT ---
from .notifications import send_consolidated_alerts


# --- 1. INGEST VIEW ---
class UniversalIngestView(APIView):
    authentication_classes = [AnsibleApiKeyAuthentication, TokenAuthentication]
    permission_classes = [] 

    def post(self, request):
        payload = request.data
        
        # --- BATCH INGEST ---
        if 'updates' in payload and isinstance(payload['updates'], list):
            success_count = 0
            processed_device_ids = []  # <-- We collect the IDs here
            
            for item in payload['updates']:
                uuid = item.get('uuid')
                if not uuid or uuid == 'no-uuid':
                    continue 
                
                try:
                    device = DataSource.objects.get(id=uuid)
                    
                    # Pass the ENTIRE item to the normalizer
                    standardized_payload = self._normalize_payload(item)
                    
                    TelemetryRecord.objects.create(source=device, payload=standardized_payload)
                    success_count += 1
                    
                    # Add to our array instead of sending immediately
                    processed_device_ids.append(device.id)
                    
                except DataSource.DoesNotExist:
                    pass
                    
            # 📧 TRIGGER ONE EMAIL FOR THE ENTIRE BATCH
            if processed_device_ids:
                send_consolidated_alerts(processed_device_ids)
                    
            return Response({"status": "batch_processed", "saved": success_count}, status=201)

        # --- SINGLE INGEST ---
        else:
            source = request.user
            if not source or not isinstance(source, DataSource):
                return Response({"error": "Unauthorized"}, status=401)
                
            record = TelemetryRecord.objects.create(source=source, payload=payload)
            
            # 📧 TRIGGER ONE EMAIL (Wrapped in a list to match the batch format)
            send_consolidated_alerts([source.id])

            return Response({"status": "success", "id": record.id}, status=201)


    def _normalize_payload(self, item):
        """
        Translates raw Ansible data into the exact format the React Frontend expects.
        """
        metrics = item.get('metrics', {})
        device_type = item.get('device_type', '')

        metrics['ip_address'] = item.get('ip_address', 'N/A')

        if 'health' in metrics:
            h = str(metrics['health']).upper()
            if h in ['OK', 'GREEN', 'HEALTHY', 'NORMAL']:
                metrics['health'] = 'HEALTHY'
            elif h in ['WARNING', 'DEGRADED', 'YELLOW', 'MINOR']:
                metrics['health'] = 'WARNING'
            elif h in ['CRITICAL', 'FAILURE', 'RED', 'ERROR', 'MAJOR']:
                metrics['health'] = 'CRITICAL'
            else:
                metrics['health'] = 'UNKNOWN'

        if device_type == 'hypervisor' and 'clusters' in metrics:
            total_cpu_used = 0
            total_cpu_cap = 0
            total_mem_used = 0
            total_mem_cap = 0

            for cluster_name, cluster_data in metrics.get('clusters', {}).items():
                res = cluster_data.get('resource_summary', {})
                total_cpu_used += res.get('cpuUsedMHz', 0)
                total_cpu_cap += res.get('cpuCapacityMHz', 0)
                total_mem_used += res.get('memUsedMB', 0)
                total_mem_cap += res.get('memCapacityMB', 0)

            if total_cpu_cap > 0:
                metrics['cpu_usage'] = round((total_cpu_used / total_cpu_cap) * 100, 1)
            if total_mem_cap > 0:
                metrics['memory_usage'] = round((total_mem_used / total_mem_cap) * 100, 1)

        return metrics

# --- 2. DEVICE LIST ---
class DeviceListView(generics.ListAPIView):
    serializer_class = DataSourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            qs = DataSource.objects.all()
        else:
            qs = DataSource.objects.filter(organization=user.organization)

        device_type = self.request.query_params.get('type')
        if device_type:
            qs = qs.filter(device_type__iexact=device_type)
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)

        return qs.order_by('-active', 'name')

# --- 3. TELEMETRY VIEW ---
class DeviceTelemetryView(generics.ListAPIView):
    serializer_class = TelemetryRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        device_id = self.kwargs['device_id']
        return TelemetryRecord.objects.filter(source_id=device_id).order_by('-timestamp')

# --- 4. METRIC CONFIGURATION ---
class MetricConfigurationView(generics.ListCreateAPIView, generics.DestroyAPIView):
    serializer_class = MetricDefinitionSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'metric_id'
    pagination_class = None 

    def get_queryset(self):
        return MetricDefinition.objects.filter(source_id=self.kwargs['device_id'])

    def perform_create(self, serializer):
        source = DataSource.objects.get(id=self.kwargs['device_id'])
        serializer.save(source=source)

# --- 5. MANAGEMENT VIEW ---
class DeviceManagementView(generics.CreateAPIView, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DataSourceSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'device_id'

    def get_queryset(self):
        if self.request.user.is_superuser:
            return DataSource.objects.all()
        return DataSource.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization, active=True)
        

# --- 6. EMAIL CONFIG VIEW ---
class EmailConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 🛡️ Strictly fetch the config for THIS user's organization
        config, created = EmailConfiguration.objects.get_or_create(organization=request.user.organization)
        serializer = EmailConfigurationSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        # 🛡️ Strictly update the config for THIS user's organization
        config, created = EmailConfiguration.objects.get_or_create(organization=request.user.organization)
        serializer = EmailConfigurationSerializer(config, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class DeviceGroupViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 🛡️ Multi-tenant security: Only show groups for the user's organization
        user = self.request.user
        if user.is_superuser:
            return DeviceGroup.objects.all().order_by('-created_at')
        return DeviceGroup.objects.filter(organization=user.organization).order_by('-created_at')

    def perform_create(self, serializer):
        # 🛡️ Automatically assign the group to the user's organization upon creation
        serializer.save(organization=self.request.user.organization)
