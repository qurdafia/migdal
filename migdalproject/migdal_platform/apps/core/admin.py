from django.contrib import admin
from .models import DataSource, MetricDefinition, TelemetryRecord, EmailConfiguration


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


@admin.register(EmailConfiguration)
class EmailConfigurationAdmin(admin.ModelAdmin):
    # What columns show up in the list view
    list_display = ['__str__', 'smtp_server', 'from_address', 'is_active']
    
    # Optional: Group the fields logically in the edit view
    fieldsets = (
        ('SMTP Server Settings', {
            'fields': ('smtp_server', 'smtp_port', 'smtp_username', 'smtp_password', 'use_tls')
        }),
        ('Routing', {
            'fields': ('from_address', 'recipient_list', 'is_active')
        }),
        ('Email Template', {
            'fields': ('subject', 'message_body')
        }),
    )

    # SECURING THE SINGLETON:
    def has_add_permission(self, request):
        # If a configuration already exists, remove the "Add" button
        if self.model.objects.exists():
            return False
        return True

    def has_delete_permission(self, request, obj=None):
        # Remove the "Delete" button so the master config can't be destroyed
        return False


# Register the models
admin.site.register(DataSource, DataSourceAdmin)
admin.site.register(TelemetryRecord, TelemetryRecordAdmin)
admin.site.register(MetricDefinition)