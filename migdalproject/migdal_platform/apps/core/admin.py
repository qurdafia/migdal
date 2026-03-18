from django.contrib import admin
from .models import DataSource, MetricDefinition, TelemetryRecord, EmailConfiguration, DeviceGroup
from django import forms

# (Keep your other core admin registrations like DataSource here)

class MetricDefinitionInline(admin.TabularInline):
    """
    Allows adding metrics (e.g., 'CPU Load') directly inside the Device page.
    """
    model = MetricDefinition
    extra = 1  # Show 1 empty slot for a new metric by default

class DataSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'device_type', 'active', 'short_api_key', 'created_at')
    list_filter = ('organization', 'device_type', 'active')
    search_fields = ('name', 'api_key', 'organization__name')
    readonly_fields = ('api_key',)  # Prevent accidental manual edits to the Key
    inlines = [MetricDefinitionInline]

    def short_api_key(self, obj):
        """Show only the start of the key for security/readability"""
        return str(obj.api_key)[:8] + "..."
    short_api_key.short_description = "API Key"

class TelemetryRecordAdmin(admin.ModelAdmin):
    """
    A read-only log viewer for incoming data.
    """
    list_display = ('timestamp', 'source', 'short_payload')
    list_filter = ('source__organization', 'source', 'timestamp')
    search_fields = ('source__name', 'payload')
    
    # Telemetry should be immutable (History cannot be changed)
    readonly_fields = ('source', 'timestamp', 'payload')

    def short_payload(self, obj):
        """Truncate long JSON data for the list view"""
        data = str(obj.payload)
        return data[:75] + "..." if len(data) > 75 else data
    short_payload.short_description = "Payload Preview"

    def has_add_permission(self, request):
        return False  # Disable the "Add" button (Data only comes from API)


class EmailConfigurationForm(forms.ModelForm):
    class Meta:
        model = EmailConfiguration
        fields = '__all__'
        widgets = {
            'smtp_password': forms.PasswordInput(render_value=True),
        }


@admin.register(EmailConfiguration)
class EmailConfigurationAdmin(admin.ModelAdmin):
    list_display = ('organization', 'smtp_server', 'from_address', 'is_active')
    search_fields = ('organization__name', 'smtp_server', 'from_address')
    list_filter = ('is_active',)
    
    # Optional: Make sure they can select the organization when creating manually
    fields = (
        'organization',
        'is_active',
        'smtp_server',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'use_tls',
        'from_address',
        'recipient_list',
        'subject',
        'message_body'
    )


@admin.register(DeviceGroup)
class DeviceGroupAdmin(admin.ModelAdmin):
    # What columns to show in the list view
    list_display = ('name', 'organization', 'get_device_count', 'created_at')
    
    # Add a search bar
    search_fields = ('name', 'description')
    
    # Add a filter sidebar
    list_filter = ('organization',)
    
    # 🌟 MAGIC: This turns the standard multi-select box into a beautiful side-by-side picker!
    filter_horizontal = ('devices',)

    # Custom column to show how many devices are in this group
    def get_device_count(self, obj):
        return obj.devices.count()
    get_device_count.short_description = 'Number of Devices'


admin.site.register(DataSource, DataSourceAdmin)
admin.site.register(TelemetryRecord, TelemetryRecordAdmin)
admin.site.register(MetricDefinition)