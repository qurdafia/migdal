from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication 

from .models import DataSource, TelemetryRecord, MetricDefinition, EmailConfiguration
from .serializers import DataSourceSerializer, TelemetryRecordSerializer, MetricDefinitionSerializer, EmailConfigurationSerializer
from .authentication import AnsibleApiKeyAuthentication


# --- 1. INGEST VIEW ---
class UniversalIngestView(APIView):
    authentication_classes = [AnsibleApiKeyAuthentication, TokenAuthentication]
    permission_classes = [] 

    def post(self, request):
        payload = request.data
        
        # --- BATCH INGEST ---
        if 'updates' in payload and isinstance(payload['updates'], list):
            success_count = 0
            
            for item in payload['updates']:
                uuid = item.get('uuid')
                if not uuid or uuid == 'no-uuid':
                    continue 
                
                try:
                    device = DataSource.objects.get(id=uuid)
                    
                    # FIX: Pass the ENTIRE item to the normalizer, not just the metrics
                    standardized_payload = self._normalize_payload(item)
                    
                    TelemetryRecord.objects.create(source=device, payload=standardized_payload)
                    success_count += 1
                    
                except DataSource.DoesNotExist:
                    pass
                    
            return Response({"status": "batch_processed", "saved": success_count}, status=201)

        # --- SINGLE INGEST ---
        else:
            source = request.user
            if not source or not isinstance(source, DataSource):
                return Response({"error": "Unauthorized"}, status=401)
                
            record = TelemetryRecord.objects.create(source=source, payload=payload)
            return Response({"status": "success", "id": record.id}, status=201)


    def _normalize_payload(self, item):
        """
        Translates raw Ansible data into the exact format the React Frontend expects.
        """
        # 1. Grab the metrics dict
        metrics = item.get('metrics', {})
        device_type = item.get('device_type', '')

        # -----------------------------------------------------
        # FIX 1: INJECT IP ADDRESS INTO METRICS
        # -----------------------------------------------------
        metrics['ip_address'] = item.get('ip_address', 'N/A')

        # -----------------------------------------------------
        # FIX 2: NORMALIZE HEALTH STATUS
        # -----------------------------------------------------
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

        # -----------------------------------------------------
        # FIX 3: CALCULATE VCENTER CPU & MEMORY %
        # -----------------------------------------------------
        if device_type == 'hypervisor' and 'clusters' in metrics:
            total_cpu_used = 0
            total_cpu_cap = 0
            total_mem_used = 0
            total_mem_cap = 0

            # Loop through all clusters (Our-LAB, Innovation-Team, etc.)
            for cluster_name, cluster_data in metrics.get('clusters', {}).items():
                res = cluster_data.get('resource_summary', {})
                total_cpu_used += res.get('cpuUsedMHz', 0)
                total_cpu_cap += res.get('cpuCapacityMHz', 0)
                total_mem_used += res.get('memUsedMB', 0)
                total_mem_cap += res.get('memCapacityMB', 0)

            # Calculate the total percentage across the whole vCenter
            if total_cpu_cap > 0:
                metrics['cpu_usage'] = round((total_cpu_used / total_cpu_cap) * 100, 1)
            if total_mem_cap > 0:
                metrics['memory_usage'] = round((total_mem_used / total_mem_cap) * 100, 1)

        # Storage (PowerStore) already has 'cpu_load' generated correctly in Ansible.

        return metrics

# # --- 1. INGEST VIEW ---
# class UniversalIngestView(APIView):
#     authentication_classes = [AnsibleApiKeyAuthentication]
#     permission_classes = [] 

#     def post(self, request):
#         source = request.user
#         if not source:
#             return Response({"error": "Unauthorized"}, status=401)
#         record = TelemetryRecord.objects.create(source=source, payload=request.data)
#         return Response({"status": "success", "id": record.id}, status=201)

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

        # Filters
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

# --- 4. METRIC CONFIGURATION (THE FIX IS HERE) ---
class MetricConfigurationView(generics.ListCreateAPIView, generics.DestroyAPIView):
    serializer_class = MetricDefinitionSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'metric_id'
    
    # !!! DISABLE PAGINATION FOR THIS VIEW !!!
    # This ensures the API returns a simple Array [ ... ]
    pagination_class = None 

    def get_queryset(self):
        return MetricDefinition.objects.filter(source_id=self.kwargs['device_id'])

    def perform_create(self, serializer):
        source = DataSource.objects.get(id=self.kwargs['device_id'])
        serializer.save(source=source)

# --- 5. MANAGEMENT VIEW ---

# CHANGE: Inherit from RetrieveUpdateDestroyAPIView instead of DestroyAPIView
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


class EmailConfigView(APIView):
    # Lock this down so only logged-in users can see/change SMTP passwords
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Force it to always use row ID 1
        config, created = EmailConfiguration.objects.get_or_create(id=1)
        serializer = EmailConfigurationSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        config, created = EmailConfiguration.objects.get_or_create(id=1)
        # partial=True means React can update just one field at a time if it wants to
        serializer = EmailConfigurationSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
