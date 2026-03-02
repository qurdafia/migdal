from django.urls import path
from .views import (
    UniversalIngestView, 
    DeviceListView, 
    DeviceTelemetryView, 
    DeviceManagementView, 
    MetricConfigurationView
)

urlpatterns = [
    # 1. Ingest Endpoint (Used by Ansible/Scripts)
    path('ingest/', UniversalIngestView.as_view(), name='ingest'),
    
    # 2. Device List (Used by Dashboard List View)
    # Supports ?page=1 and ?type=hypervisor
    path('devices/', DeviceListView.as_view(), name='device-list'),

    # 3. Device Telemetry (Used by Dashboard Detail View / Graphs)
    path('devices/<uuid:device_id>/telemetry/', DeviceTelemetryView.as_view(), name='device-telemetry'),

    # 4. Management (Used by Inventory Manager)
    # POST to create, DELETE to remove
    path('devices/manage/', DeviceManagementView.as_view(), name='device-create'),
    path('devices/manage/<uuid:device_id>/', DeviceManagementView.as_view(), name='device-delete'),

    # 5. Metric Configuration (Used by Dashboard Detail View)
    # GET/POST to list/add metrics
    path('devices/<uuid:device_id>/metrics/', MetricConfigurationView.as_view(), name='metric-list'),
    # DELETE to remove a specific metric config
    path('devices/<uuid:device_id>/metrics/<int:metric_id>/', MetricConfigurationView.as_view(), name='metric-delete'),
]


# from django.urls import path
# from .views import UniversalIngestView, DeviceListView, DeviceTelemetryView, DeviceManagementView, MetricConfigurationView

# urlpatterns = [
#     # Ansible Writes Here:
#     path('ingest/', UniversalIngestView.as_view(), name='ingest'),
    
#     # React Reads Here:
#     path('devices/', DeviceListView.as_view(), name='device-list'),
#     path('devices/<uuid:device_id>/telemetry/', DeviceTelemetryView.as_view(), name='device-telemetry'),

#     # NEW: Management
#     path('devices/manage/', DeviceManagementView.as_view(), name='device-create'),
#     path('devices/manage/<uuid:device_id>/', DeviceManagementView.as_view(), name='device-delete'),

#     # NEW: Metric Configuration
#     path('devices/<uuid:device_id>/metrics/', MetricConfigurationView.as_view(), name='metric-list'),
#     path('devices/<uuid:device_id>/metrics/<int:metric_id>/', MetricConfigurationView.as_view(), name='metric-delete'),
# ]